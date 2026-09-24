import UIKit
import Capacitor
import WebKit
import AVFoundation

class PullToRefreshViewController: CAPBridgeViewController, WKScriptMessageHandler {

    private let refreshControl = UIRefreshControl()
    private var audioRecorder: AVAudioRecorder?
    private var audioFileURL: URL?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(MultiCameraPlugin())
        print("📸 [MultiCameraPlugin] Registered in capacitorDidLoad")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        bridge?.registerPluginInstance(MultiCameraPlugin())
        print("📸 [MultiCameraPlugin] Registered in viewDidLoad")

        // Spinner negro sobre fondo blanco
        refreshControl.tintColor = UIColor.black
        refreshControl.addTarget(self, action: #selector(handleRefresh(_:)), for: .valueChanged)

        // Fondo blanco
        webView?.backgroundColor = .white
        webView?.scrollView.backgroundColor = .white
        webView?.isOpaque = true

        // NO ajustar content inset
        webView?.scrollView.contentInsetAdjustmentBehavior = .never

        // Agregar refresh control
        webView?.scrollView.refreshControl = refreshControl
        webView?.scrollView.bounces = true

        // Registrar message handlers
        webView?.configuration.userContentController.add(self, name: "pullToRefresh")
        webView?.configuration.userContentController.add(self, name: "audioRecorder")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "pullToRefresh" {
            if let body = message.body as? [String: Any], let enabled = body["enabled"] as? Bool {
                DispatchQueue.main.async { [weak self] in
                    if enabled {
                        self?.webView?.scrollView.refreshControl = self?.refreshControl
                    } else {
                        self?.refreshControl.endRefreshing()
                        self?.webView?.scrollView.refreshControl = nil
                    }
                }
            }
        } else if message.name == "audioRecorder" {
            guard let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }

            switch action {
            case "start":
                startAudioRecording()
            case "stop":
                stopAudioRecording()
            case "cancel":
                cancelAudioRecording()
            default:
                break
            }
        }
    }

    // ── Audio Recording ──

    private func startAudioRecording() {
        let session = AVAudioSession.sharedInstance()
        
        session.requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                if granted {
                    self?.beginRecording()
                } else {
                    self?.sendAudioEvent("error", data: "Permiso de micrófono denegado")
                }
            }
        }
    }

    private func beginRecording() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try session.setActive(true)
        } catch {
            sendAudioEvent("error", data: "No se pudo configurar el audio: \(error.localizedDescription)")
            return
        }

        let tempDir = FileManager.default.temporaryDirectory
        let filename = "recording_\(Int(Date().timeIntervalSince1970)).m4a"
        audioFileURL = tempDir.appendingPathComponent(filename)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: audioFileURL!, settings: settings)
            audioRecorder?.record()
            sendAudioEvent("started", data: nil)
        } catch {
            sendAudioEvent("error", data: "Error al grabar: \(error.localizedDescription)")
        }
    }

    private func stopAudioRecording() {
        guard let recorder = audioRecorder, recorder.isRecording else {
            sendAudioEvent("error", data: "No hay grabación activa")
            return
        }

        recorder.stop()

        guard let url = audioFileURL, let data = try? Data(contentsOf: url) else {
            sendAudioEvent("error", data: "No se pudo leer el audio grabado")
            return
        }

        let base64 = data.base64EncodedString()
        sendAudioEvent("stopped", data: base64)

        // Limpiar archivo temporal
        try? FileManager.default.removeItem(at: url)
        audioRecorder = nil
        audioFileURL = nil
    }

    private func cancelAudioRecording() {
        audioRecorder?.stop()
        if let url = audioFileURL {
            try? FileManager.default.removeItem(at: url)
        }
        audioRecorder = nil
        audioFileURL = nil
        sendAudioEvent("cancelled", data: nil)
    }

    private func sendAudioEvent(_ event: String, data: String?) {
        let dataStr = data != nil ? "\"\(data!)\"" : "null"
        let js = "window.__onNativeAudioEvent && window.__onNativeAudioEvent('\(event)', \(dataStr));"
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("❌ [AudioRecorder] evaluateJavaScript error: \(error.localizedDescription)")
                } else {
                    let len = data?.count ?? 0
                    print("✅ [AudioRecorder] Evento '\(event)' enviado con éxito (\(len) chars)")
                }
            }
        }
    }

    // ── Pull to Refresh ──

    @objc private func handleRefresh(_ sender: UIRefreshControl) {
        webView?.evaluateJavaScript("""
            if (window.onNativePullToRefresh) {
                window.onNativePullToRefresh();
            } else {
                window.location.reload();
            }
        """) { _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                sender.endRefreshing()
            }
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = PullToRefreshViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
