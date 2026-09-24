import Foundation
import Capacitor
import AVFoundation
import UIKit
import Photos
import CoreMotion

@objc(MultiCameraPlugin)
public class MultiCameraPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MultiCameraPlugin"
    public let jsName = "MultiCamera"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openCamera", returnType: CAPPluginReturnPromise)
    ]

    @objc func openCamera(_ call: CAPPluginCall) {
        let maxPhotos = call.getInt("maxPhotos") ?? 20

        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else {
                call.reject("No se pudo obtener el view controller")
                return
            }

            let cameraVC = MultiCameraViewController()
            cameraVC.maxPhotos = maxPhotos
            cameraVC.modalPresentationStyle = .fullScreen
            cameraVC.onComplete = { photos in
                // photos: [CapturedPhoto]
                var results: [[String: Any]] = []
                for photo in photos {
                    results.append([
                        "path": photo.filePath,
                        "webPath": photo.webPath,
                        "format": "jpeg",
                        "width": photo.width,
                        "height": photo.height
                    ])
                }
                call.resolve(["photos": results])
            }
            cameraVC.onCancel = {
                call.resolve(["photos": []])
            }

            viewController.present(cameraVC, animated: true)
        }
    }
}

// MARK: - Data model

struct CapturedPhoto {
    let image: UIImage
    let filePath: String
    let webPath: String
    let width: Int
    let height: Int
}

// MARK: - MultiCameraViewController

class MultiCameraViewController: UIViewController {

    var maxPhotos: Int = 20
    var onComplete: (([CapturedPhoto]) -> Void)?
    var onCancel: (() -> Void)?

    // Capture
    private let captureSession = AVCaptureSession()
    private var currentDevice: AVCaptureDevice?
    private var photoOutput = AVCapturePhotoOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer!

    // Lens data
    private struct LensOption {
        let device: AVCaptureDevice
        let label: String       // "0.5", "1", "2"
        let zoomFactor: CGFloat // virtual zoom within the device
    }
    private var lensOptions: [LensOption] = []
    private var selectedLensIndex: Int = 0

    // State
    private var capturedPhotos: [CapturedPhoto] = []
    private var isCapturing = false

    // UI
    private let closeButton = UIButton(type: .system)
    private let aspectRatioButton = UIButton(type: .system)
    private let photoCountLabel = UILabel()
    private let zoomStack = UIStackView()
    private let thumbnailScroll = UIScrollView()
    private let thumbnailStack = UIStackView()
    private let captureButton = UIButton(type: .custom)
    private let galleryButton = UIButton(type: .system)
    private let doneButton = UIButton(type: .system)
    private let flashOverlay = UIView()

    // Preview Container & Aspect Ratio (4:3 vs 16:9)
    private let previewContainer = UIView()
    private var previewHeightConstraint: NSLayoutConstraint?
    private var previewTopConstraint: NSLayoutConstraint?
    private var is16by9: Bool = false

    // Orientation & Motion (CoreMotion accelerometer, ignores system portrait lock)
    private let motionManager = CMMotionManager()
    private var physicalOrientation: AVCaptureVideoOrientation = .portrait
    private var currentUIAngle: CGFloat = 0

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        setupPreview()
        setupCamera()
        setupUI()
        startMotionUpdates()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession.startRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        captureSession.stopRunning()
        stopMotionUpdates()
    }

    override var prefersStatusBarHidden: Bool { true }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = previewContainer.bounds
    }

    // MARK: - CoreMotion Orientation Handling

    private func startMotionUpdates() {
        guard motionManager.isAccelerometerAvailable else { return }
        motionManager.accelerometerUpdateInterval = 0.15
        motionManager.startAccelerometerUpdates(to: .main) { [weak self] (data, error) in
            guard let self = self, let data = data else { return }
            self.handleAccelerometer(x: data.acceleration.x, y: data.acceleration.y)
        }
    }

    private func stopMotionUpdates() {
        motionManager.stopAccelerometerUpdates()
    }

    private func handleAccelerometer(x: Double, y: Double) {
        let newOrientation: AVCaptureVideoOrientation
        let targetAngle: CGFloat
        let threshold = 0.45

        if abs(x) > abs(y) {
            if x > threshold {
                // Device rotated clockwise: top points right, bottom/port points left (Landscape Left)
                newOrientation = .landscapeLeft
                targetAngle = -.pi / 2
            } else if x < -threshold {
                // Device rotated counter-clockwise: top points left, bottom/port points right (Landscape Right)
                newOrientation = .landscapeRight
                targetAngle = .pi / 2
            } else {
                return
            }
        } else {
            if y < -threshold {
                // Upright Portrait
                newOrientation = .portrait
                targetAngle = 0
            } else if y > threshold {
                // Upside down Portrait
                newOrientation = .portraitUpsideDown
                targetAngle = .pi
            } else {
                return
            }
        }

        if newOrientation != physicalOrientation {
            physicalOrientation = newOrientation
            currentUIAngle = targetAngle
            animateRotation(to: targetAngle)
        }
    }

    private func animateRotation(to angle: CGFloat) {
        UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseInOut, .beginFromCurrentState], animations: { [weak self] in
            guard let self = self else { return }
            self.closeButton.transform = CGAffineTransform(rotationAngle: angle)
            self.aspectRatioButton.transform = CGAffineTransform(rotationAngle: angle)
            self.photoCountLabel.transform = CGAffineTransform(rotationAngle: angle)
            self.galleryButton.transform = CGAffineTransform(rotationAngle: angle)
            self.doneButton.transform = CGAffineTransform(rotationAngle: angle)

            for view in self.zoomStack.arrangedSubviews {
                view.transform = CGAffineTransform(rotationAngle: angle)
            }

            for view in self.thumbnailStack.arrangedSubviews {
                view.transform = CGAffineTransform(rotationAngle: angle)
            }
        }, completion: nil)
    }

    // MARK: - Camera Setup

    private func setupCamera() {
        captureSession.beginConfiguration()

        // Remove existing inputs
        for input in captureSession.inputs {
            captureSession.removeInput(input)
        }
        for output in captureSession.outputs {
            captureSession.removeOutput(output)
        }

        captureSession.sessionPreset = .photo

        // Discover available lenses (Back camera)
        lensOptions.removeAll()

        // Check for virtual multi-camera systems (iPhone 11, 12, 13, 14, 15, Pro, etc.)
        // Virtual cameras keep both sensors active, avoid lag when switching to 0.5x, and allow instant zoom changes without restarting the capture session.
        let discovery = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInTripleCamera, .builtInDualWideCamera],
            mediaType: .video,
            position: .back
        )

        if let virtualDevice = discovery.devices.first {
            let switchFactors = virtualDevice.virtualDeviceSwitchOverVideoZoomFactors.map { CGFloat($0.doubleValue) }

            if virtualDevice.deviceType == .builtInTripleCamera, switchFactors.count >= 2 {
                // Triple camera: 0.5x, 1x, 2x or 3x
                lensOptions.append(LensOption(device: virtualDevice, label: "0.5", zoomFactor: 1.0))
                lensOptions.append(LensOption(device: virtualDevice, label: "1", zoomFactor: switchFactors[0]))
                let teleLabel = switchFactors[1] >= switchFactors[0] * 2.5 ? "3" : "2"
                lensOptions.append(LensOption(device: virtualDevice, label: teleLabel, zoomFactor: switchFactors[1]))
            } else if switchFactors.count >= 1 {
                // Dual wide camera (e.g. iPhone 11, 12, 13, 14, 15):
                // 1.0 = 0.5x (Ultra Wide)
                // switchFactors[0] (typically 2.0) = 1.0x (Wide)
                // switchFactors[0] * 2.0 (typically 4.0) = 2.0x (Telephoto/Zoom)
                let wideFactor = switchFactors[0]
                lensOptions.append(LensOption(device: virtualDevice, label: "0.5", zoomFactor: 1.0))
                lensOptions.append(LensOption(device: virtualDevice, label: "1", zoomFactor: wideFactor))
                let teleZoom = min(wideFactor * 2.0, virtualDevice.maxAvailableVideoZoomFactor)
                lensOptions.append(LensOption(device: virtualDevice, label: "2", zoomFactor: teleZoom))
            } else {
                lensOptions.append(LensOption(device: virtualDevice, label: "1", zoomFactor: 1.0))
            }
        } else {
            // Fallback for single camera devices or legacy models
            if let ultraWide = AVCaptureDevice.default(.builtInUltraWideCamera, for: .video, position: .back) {
                lensOptions.append(LensOption(device: ultraWide, label: "0.5", zoomFactor: 1.0))
            }
            if let wide = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) {
                lensOptions.append(LensOption(device: wide, label: "1", zoomFactor: 1.0))
                lensOptions.append(LensOption(device: wide, label: "2", zoomFactor: 2.0))
            }
        }

        // Default to 1x if available, otherwise first
        selectedLensIndex = lensOptions.firstIndex(where: { $0.label == "1" }) ?? 0

        guard !lensOptions.isEmpty else {
            captureSession.commitConfiguration()
            return
        }

        let lens = lensOptions[selectedLensIndex]
        activateLens(lens)

        // Photo output
        photoOutput = AVCapturePhotoOutput()
        photoOutput.isHighResolutionCaptureEnabled = true
        if captureSession.canAddOutput(photoOutput) {
            captureSession.addOutput(photoOutput)
        }

        captureSession.commitConfiguration()
        currentDevice = lens.device
        rebuildZoomButtons()
    }

    private func activateLens(_ lens: LensOption) {
        guard let input = try? AVCaptureDeviceInput(device: lens.device) else { return }
        if captureSession.canAddInput(input) {
            captureSession.addInput(input)
        }

        do {
            try lens.device.lockForConfiguration()

            // Apply zoom factor
            if lens.zoomFactor > 1.0 {
                lens.device.videoZoomFactor = min(lens.zoomFactor, lens.device.maxAvailableVideoZoomFactor)
            } else {
                lens.device.videoZoomFactor = 1.0
            }

            // Lock frame rate to 30 FPS so preview never drops to 15 FPS in low light (fixes 0.5x lag)
            let targetFPS: Double = 30.0
            if let _ = lens.device.activeFormat.videoSupportedFrameRateRanges.first(where: {
                $0.minFrameRate <= targetFPS && $0.maxFrameRate >= targetFPS
            }) {
                let frameDuration = CMTime(value: 1, timescale: 30)
                lens.device.activeVideoMinFrameDuration = frameDuration
                lens.device.activeVideoMaxFrameDuration = frameDuration
            }

            // Smooth autofocus & autoexposure
            if lens.device.isSmoothAutoFocusSupported {
                lens.device.isSmoothAutoFocusEnabled = true
            }
            if lens.device.isFocusModeSupported(.continuousAutoFocus) {
                lens.device.focusMode = .continuousAutoFocus
            }
            if lens.device.isExposureModeSupported(.continuousAutoExposure) {
                lens.device.exposureMode = .continuousAutoExposure
            }

            lens.device.unlockForConfiguration()
        } catch {
            print("⚠️ [MultiCamera] Device configuration error: \(error)")
        }

        currentDevice = lens.device
    }

    private func switchToLens(at index: Int) {
        guard index >= 0, index < lensOptions.count, index != selectedLensIndex else { return }

        let targetLens = lensOptions[index]
        selectedLensIndex = index

        if targetLens.device == currentDevice {
            // Same virtual device! Adjust zoom factor instantaneously without restarting the session
            do {
                try targetLens.device.lockForConfiguration()
                targetLens.device.videoZoomFactor = targetLens.zoomFactor
                targetLens.device.unlockForConfiguration()
            } catch {
                print("⚠️ [MultiCamera] Error setting zoom factor: \(error)")
            }
        } else {
            // Fallback for different physical devices
            captureSession.beginConfiguration()
            for input in captureSession.inputs {
                captureSession.removeInput(input)
            }
            activateLens(targetLens)
            captureSession.commitConfiguration()
        }

        updateZoomUI()
    }

    // MARK: - Preview

    private func setupPreview() {
        previewContainer.translatesAutoresizingMaskIntoConstraints = false
        previewContainer.backgroundColor = .black
        previewContainer.clipsToBounds = true
        view.insertSubview(previewContainer, at: 0)

        previewTopConstraint = previewContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 54)
        previewHeightConstraint = previewContainer.heightAnchor.constraint(equalTo: previewContainer.widthAnchor, multiplier: 4.0 / 3.0)

        NSLayoutConstraint.activate([
            previewContainer.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            previewContainer.widthAnchor.constraint(equalTo: view.widthAnchor),
            previewTopConstraint!,
            previewHeightConstraint!
        ])

        previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        previewLayer.videoGravity = .resizeAspectFill
        previewContainer.layer.addSublayer(previewLayer)
    }

    // MARK: - UI Setup

    private func setupUI() {
        // Flash overlay
        flashOverlay.backgroundColor = .white
        flashOverlay.alpha = 0
        flashOverlay.isUserInteractionEnabled = false
        flashOverlay.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(flashOverlay)
        NSLayoutConstraint.activate([
            flashOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            flashOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            flashOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            flashOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        setupTopBar()
        setupZoomSelector()
        setupThumbnailStrip()
        setupBottomControls()
    }

    private func setupTopBar() {
        let topBar = UIView()
        topBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(topBar)

        NSLayoutConstraint.activate([
            topBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            topBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            topBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            topBar.heightAnchor.constraint(equalToConstant: 50),
        ])

        // Close button
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        let xImage = UIImage(systemName: "xmark")?.withConfiguration(
            UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)
        )
        closeButton.setImage(xImage, for: .normal)
        closeButton.tintColor = .white
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.4)
        closeButton.layer.cornerRadius = 22
        closeButton.clipsToBounds = true
        closeButton.addTarget(self, action: #selector(handleCancel), for: .touchUpInside)
        topBar.addSubview(closeButton)

        NSLayoutConstraint.activate([
            closeButton.leadingAnchor.constraint(equalTo: topBar.leadingAnchor),
            closeButton.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 44),
            closeButton.heightAnchor.constraint(equalToConstant: 44),
        ])

        // Photo count
        photoCountLabel.translatesAutoresizingMaskIntoConstraints = false
        photoCountLabel.textColor = .white
        photoCountLabel.font = .systemFont(ofSize: 13, weight: .bold)
        photoCountLabel.textAlignment = .center
        photoCountLabel.backgroundColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 0.9)
        photoCountLabel.layer.cornerRadius = 14
        photoCountLabel.clipsToBounds = true
        photoCountLabel.isHidden = true
        topBar.addSubview(photoCountLabel)

        NSLayoutConstraint.activate([
            photoCountLabel.centerXAnchor.constraint(equalTo: topBar.centerXAnchor),
            photoCountLabel.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            photoCountLabel.heightAnchor.constraint(equalToConstant: 28),
            photoCountLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 60),
        ])

        // Aspect ratio toggle button (4:3 / 16:9)
        aspectRatioButton.translatesAutoresizingMaskIntoConstraints = false
        aspectRatioButton.setTitle("4:3", for: .normal)
        aspectRatioButton.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
        aspectRatioButton.setTitleColor(.white, for: .normal)
        aspectRatioButton.backgroundColor = UIColor.black.withAlphaComponent(0.4)
        aspectRatioButton.layer.cornerRadius = 17
        aspectRatioButton.clipsToBounds = true
        aspectRatioButton.addTarget(self, action: #selector(handleAspectRatioToggle), for: .touchUpInside)
        topBar.addSubview(aspectRatioButton)

        NSLayoutConstraint.activate([
            aspectRatioButton.trailingAnchor.constraint(equalTo: topBar.trailingAnchor),
            aspectRatioButton.centerYAnchor.constraint(equalTo: topBar.centerYAnchor),
            aspectRatioButton.widthAnchor.constraint(equalToConstant: 48),
            aspectRatioButton.heightAnchor.constraint(equalToConstant: 34),
        ])
    }

    @objc private func handleAspectRatioToggle() {
        is16by9.toggle()
        aspectRatioButton.setTitle(is16by9 ? "16:9" : "4:3", for: .normal)

        previewHeightConstraint?.isActive = false
        previewTopConstraint?.isActive = false

        if is16by9 {
            // Fullscreen 16:9
            previewTopConstraint = previewContainer.topAnchor.constraint(equalTo: view.topAnchor)
            previewHeightConstraint = previewContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        } else {
            // Standard 4:3 box
            previewTopConstraint = previewContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 54)
            previewHeightConstraint = previewContainer.heightAnchor.constraint(equalTo: previewContainer.widthAnchor, multiplier: 4.0 / 3.0)
        }

        previewTopConstraint?.isActive = true
        previewHeightConstraint?.isActive = true

        UIView.animate(withDuration: 0.25) {
            self.view.layoutIfNeeded()
            self.previewLayer?.frame = self.previewContainer.bounds
        }
    }

    private func setupZoomSelector() {
        zoomStack.axis = .horizontal
        zoomStack.spacing = 4
        zoomStack.alignment = .center
        zoomStack.distribution = .fill
        zoomStack.translatesAutoresizingMaskIntoConstraints = false

        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = UIColor.black.withAlphaComponent(0.45)
        container.layer.cornerRadius = 20
        container.clipsToBounds = true
        view.addSubview(container)
        container.addSubview(zoomStack)

        NSLayoutConstraint.activate([
            container.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            container.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -180),
            container.heightAnchor.constraint(equalToConstant: 40),

            zoomStack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 6),
            zoomStack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -6),
            zoomStack.centerYAnchor.constraint(equalTo: container.centerYAnchor),
        ])

        rebuildZoomButtons()
    }

    private func rebuildZoomButtons() {
        zoomStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        for (index, lens) in lensOptions.enumerated() {
            let btn = UIButton(type: .system)
            btn.tag = index
            btn.setTitle(lens.label + "×", for: .normal)
            btn.titleLabel?.font = .systemFont(ofSize: 13, weight: .bold)
            btn.layer.cornerRadius = 16
            btn.clipsToBounds = true
            btn.transform = CGAffineTransform(rotationAngle: currentUIAngle)

            btn.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                btn.widthAnchor.constraint(equalToConstant: 44),
                btn.heightAnchor.constraint(equalToConstant: 32),
            ])

            btn.addTarget(self, action: #selector(zoomTapped(_:)), for: .touchUpInside)
            zoomStack.addArrangedSubview(btn)
        }

        updateZoomUI()
    }

    private func updateZoomUI() {
        for (index, subview) in zoomStack.arrangedSubviews.enumerated() {
            guard let btn = subview as? UIButton else { continue }
            if index == selectedLensIndex {
                btn.backgroundColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 1.0)
                btn.setTitleColor(.white, for: .normal)
            } else {
                btn.backgroundColor = .clear
                btn.setTitleColor(UIColor.white.withAlphaComponent(0.7), for: .normal)
            }
        }
    }

    private func setupThumbnailStrip() {
        thumbnailScroll.translatesAutoresizingMaskIntoConstraints = false
        thumbnailScroll.showsHorizontalScrollIndicator = false
        thumbnailScroll.alwaysBounceHorizontal = true
        view.addSubview(thumbnailScroll)

        thumbnailStack.axis = .horizontal
        thumbnailStack.spacing = 8
        thumbnailStack.alignment = .center
        thumbnailStack.translatesAutoresizingMaskIntoConstraints = false
        thumbnailScroll.addSubview(thumbnailStack)

        NSLayoutConstraint.activate([
            thumbnailScroll.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            thumbnailScroll.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            thumbnailScroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -100),
            thumbnailScroll.heightAnchor.constraint(equalToConstant: 64),

            thumbnailStack.leadingAnchor.constraint(equalTo: thumbnailScroll.leadingAnchor),
            thumbnailStack.trailingAnchor.constraint(equalTo: thumbnailScroll.trailingAnchor),
            thumbnailStack.topAnchor.constraint(equalTo: thumbnailScroll.topAnchor),
            thumbnailStack.bottomAnchor.constraint(equalTo: thumbnailScroll.bottomAnchor),
            thumbnailStack.heightAnchor.constraint(equalTo: thumbnailScroll.heightAnchor),
        ])
    }

    private func setupBottomControls() {
        let bottomBar = UIView()
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(bottomBar)

        NSLayoutConstraint.activate([
            bottomBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 28),
            bottomBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -28),
            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            bottomBar.heightAnchor.constraint(equalToConstant: 76),
        ])

        // Gallery button
        galleryButton.translatesAutoresizingMaskIntoConstraints = false
        let galleryImage = UIImage(systemName: "photo.on.rectangle.angled")?.withConfiguration(
            UIImage.SymbolConfiguration(pointSize: 20, weight: .medium)
        )
        galleryButton.setImage(galleryImage, for: .normal)
        galleryButton.tintColor = .white
        galleryButton.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        galleryButton.layer.cornerRadius = 22
        galleryButton.layer.borderWidth = 1
        galleryButton.layer.borderColor = UIColor.white.withAlphaComponent(0.28).cgColor
        galleryButton.clipsToBounds = true
        galleryButton.addTarget(self, action: #selector(handleGallery), for: .touchUpInside)
        bottomBar.addSubview(galleryButton)

        NSLayoutConstraint.activate([
            galleryButton.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor),
            galleryButton.centerYAnchor.constraint(equalTo: bottomBar.centerYAnchor),
            galleryButton.widthAnchor.constraint(equalToConstant: 44),
            galleryButton.heightAnchor.constraint(equalToConstant: 44),
        ])

        // Capture button
        captureButton.translatesAutoresizingMaskIntoConstraints = false
        captureButton.backgroundColor = .clear
        captureButton.layer.cornerRadius = 38
        captureButton.layer.borderWidth = 4
        captureButton.layer.borderColor = UIColor.white.withAlphaComponent(0.9).cgColor
        captureButton.addTarget(self, action: #selector(handleCapture), for: .touchUpInside)
        bottomBar.addSubview(captureButton)

        let innerCircle = UIView()
        innerCircle.translatesAutoresizingMaskIntoConstraints = false
        innerCircle.backgroundColor = .white
        innerCircle.layer.cornerRadius = 30
        innerCircle.isUserInteractionEnabled = false
        captureButton.addSubview(innerCircle)

        NSLayoutConstraint.activate([
            captureButton.centerXAnchor.constraint(equalTo: bottomBar.centerXAnchor),
            captureButton.centerYAnchor.constraint(equalTo: bottomBar.centerYAnchor),
            captureButton.widthAnchor.constraint(equalToConstant: 76),
            captureButton.heightAnchor.constraint(equalToConstant: 76),

            innerCircle.centerXAnchor.constraint(equalTo: captureButton.centerXAnchor),
            innerCircle.centerYAnchor.constraint(equalTo: captureButton.centerYAnchor),
            innerCircle.widthAnchor.constraint(equalToConstant: 60),
            innerCircle.heightAnchor.constraint(equalToConstant: 60),
        ])

        // Done button
        doneButton.translatesAutoresizingMaskIntoConstraints = false
        doneButton.setTitle("Listo", for: .normal)
        doneButton.setTitleColor(.white, for: .normal)
        doneButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .bold)
        doneButton.backgroundColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 0.95)
        doneButton.layer.cornerRadius = 22
        doneButton.clipsToBounds = true
        doneButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 18, bottom: 10, right: 18)
        doneButton.isHidden = true
        doneButton.layer.shadowColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 0.4).cgColor
        doneButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        doneButton.layer.shadowRadius = 16
        doneButton.layer.shadowOpacity = 1.0
        doneButton.addTarget(self, action: #selector(handleDone), for: .touchUpInside)
        bottomBar.addSubview(doneButton)

        // Add checkmark to done button
        let checkImage = UIImage(systemName: "checkmark")?.withConfiguration(
            UIImage.SymbolConfiguration(pointSize: 14, weight: .bold)
        )
        doneButton.setImage(checkImage, for: .normal)
        doneButton.tintColor = .white
        doneButton.semanticContentAttribute = .forceLeftToRight
        doneButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: -4, bottom: 0, right: 4)

        NSLayoutConstraint.activate([
            doneButton.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor),
            doneButton.centerYAnchor.constraint(equalTo: bottomBar.centerYAnchor),
            doneButton.heightAnchor.constraint(equalToConstant: 44),
        ])
    }

    // MARK: - Actions

    @objc private func handleCancel() {
        captureSession.stopRunning()
        dismiss(animated: true) { [weak self] in
            self?.onCancel?()
        }
    }

    @objc private func zoomTapped(_ sender: UIButton) {
        switchToLens(at: sender.tag)
    }

    @objc private func handleCapture() {
        guard !isCapturing, capturedPhotos.count < maxPhotos else { return }
        isCapturing = true

        // Flash animation
        UIView.animate(withDuration: 0.05, animations: {
            self.flashOverlay.alpha = 0.6
        }) { _ in
            UIView.animate(withDuration: 0.15) {
                self.flashOverlay.alpha = 0
            }
        }

        // Haptic
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        // Capture with correct orientation
        let settings = AVCapturePhotoSettings()
        settings.isHighResolutionPhotoEnabled = true

        if let connection = photoOutput.connection(with: .video) {
            if connection.isVideoOrientationSupported {
                connection.videoOrientation = physicalOrientation
            }
        }

        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    @objc private func handleDone() {
        captureSession.stopRunning()
        dismiss(animated: true) { [weak self] in
            guard let self = self else { return }
            self.onComplete?(self.capturedPhotos)
        }
    }

    @objc private func handleGallery() {
        let remaining = maxPhotos - capturedPhotos.count
        guard remaining > 0 else { return }

        let picker = UIImagePickerController()
        picker.sourceType = .photoLibrary
        picker.delegate = self
        picker.allowsEditing = false
        present(picker, animated: true)
    }

    @objc private func handleDeletePhoto(_ sender: UIButton) {
        let index = sender.tag
        guard index >= 0, index < capturedPhotos.count else { return }

        // Delete file
        let photo = capturedPhotos[index]
        try? FileManager.default.removeItem(atPath: photo.filePath)

        capturedPhotos.remove(at: index)
        updateThumbnails()
        updatePhotoCount()
    }

    // MARK: - Helpers

    private func savePhotoToDisk(_ image: UIImage) -> CapturedPhoto? {
        guard let data = image.jpegData(compressionQuality: 0.82) else { return nil }

        let tempDir = FileManager.default.temporaryDirectory
        let filename = "multicam_\(Int(Date().timeIntervalSince1970 * 1000)).jpeg"
        let fileURL = tempDir.appendingPathComponent(filename)

        do {
            try data.write(to: fileURL)
            return CapturedPhoto(
                image: image,
                filePath: fileURL.path,
                webPath: fileURL.absoluteString,
                width: Int(image.size.width),
                height: Int(image.size.height)
            )
        } catch {
            print("❌ [MultiCamera] Error saving photo: \(error)")
            return nil
        }
    }

    private func updatePhotoCount() {
        let count = capturedPhotos.count
        if count > 0 {
            photoCountLabel.isHidden = false
            photoCountLabel.text = "  \(count) foto\(count != 1 ? "s" : "")  "
            doneButton.isHidden = false
        } else {
            photoCountLabel.isHidden = true
            doneButton.isHidden = true
        }
    }

    private func updateThumbnails() {
        thumbnailStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        for (index, photo) in capturedPhotos.enumerated() {
            let wrapper = UIView()
            wrapper.translatesAutoresizingMaskIntoConstraints = false
            wrapper.transform = CGAffineTransform(rotationAngle: currentUIAngle)
            NSLayoutConstraint.activate([
                wrapper.widthAnchor.constraint(equalToConstant: 56),
                wrapper.heightAnchor.constraint(equalToConstant: 56),
            ])

            // Image
            let imageView = UIImageView(image: photo.image)
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = 10
            imageView.layer.borderWidth = 2
            imageView.layer.borderColor = UIColor.white.withAlphaComponent(0.6).cgColor
            imageView.translatesAutoresizingMaskIntoConstraints = false
            wrapper.addSubview(imageView)
            NSLayoutConstraint.activate([
                imageView.topAnchor.constraint(equalTo: wrapper.topAnchor),
                imageView.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor),
                imageView.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor),
                imageView.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor),
            ])

            // Badge
            let badge = UILabel()
            badge.text = "\(index + 1)"
            badge.font = .systemFont(ofSize: 10, weight: .bold)
            badge.textColor = .white
            badge.textAlignment = .center
            badge.backgroundColor = UIColor(red: 79/255, green: 70/255, blue: 229/255, alpha: 0.9)
            badge.layer.cornerRadius = 9
            badge.clipsToBounds = true
            badge.translatesAutoresizingMaskIntoConstraints = false
            wrapper.addSubview(badge)
            NSLayoutConstraint.activate([
                badge.topAnchor.constraint(equalTo: wrapper.topAnchor, constant: 2),
                badge.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor, constant: -2),
                badge.widthAnchor.constraint(equalToConstant: 18),
                badge.heightAnchor.constraint(equalToConstant: 18),
            ])

            // Delete button
            let deleteBtn = UIButton(type: .system)
            deleteBtn.tag = index
            let xImg = UIImage(systemName: "xmark")?.withConfiguration(
                UIImage.SymbolConfiguration(pointSize: 8, weight: .bold)
            )
            deleteBtn.setImage(xImg, for: .normal)
            deleteBtn.tintColor = .white
            deleteBtn.backgroundColor = UIColor(red: 239/255, green: 68/255, blue: 68/255, alpha: 0.9)
            deleteBtn.layer.cornerRadius = 9
            deleteBtn.clipsToBounds = true
            deleteBtn.translatesAutoresizingMaskIntoConstraints = false
            deleteBtn.addTarget(self, action: #selector(handleDeletePhoto(_:)), for: .touchUpInside)
            wrapper.addSubview(deleteBtn)
            NSLayoutConstraint.activate([
                deleteBtn.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor, constant: -2),
                deleteBtn.trailingAnchor.constraint(equalTo: wrapper.trailingAnchor, constant: -2),
                deleteBtn.widthAnchor.constraint(equalToConstant: 18),
                deleteBtn.heightAnchor.constraint(equalToConstant: 18),
            ])

            thumbnailStack.addArrangedSubview(wrapper)
        }

        // Scroll to end
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self = self else { return }
            let offsetX = max(0, self.thumbnailScroll.contentSize.width - self.thumbnailScroll.bounds.width)
            self.thumbnailScroll.setContentOffset(CGPoint(x: offsetX, y: 0), animated: true)
        }
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension MultiCameraViewController: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        isCapturing = false

        guard error == nil,
              let data = photo.fileDataRepresentation(),
              var image = UIImage(data: data) else {
            print("❌ [MultiCamera] Photo capture error: \(error?.localizedDescription ?? "unknown")")
            return
        }

        image = image.optimizedForExport(maxDimension: 1920, is16by9: self.is16by9)

        if let captured = savePhotoToDisk(image) {
            capturedPhotos.append(captured)
            updateThumbnails()
            updatePhotoCount()
        }
    }
}

// MARK: - UIImagePickerControllerDelegate (Gallery)

extension MultiCameraViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        picker.dismiss(animated: true)

        guard var image = info[.originalImage] as? UIImage else { return }
        image = image.optimizedForExport(maxDimension: 1920, is16by9: self.is16by9)

        if let captured = savePhotoToDisk(image) {
            capturedPhotos.append(captured)
            updateThumbnails()
            updatePhotoCount()
        }
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

// MARK: - UIImage Optimization & Normalization

extension UIImage {
    /// Normalizes orientation, crops to 16:9 if in 16:9 mode, and scales down to maxDimension (1920px).
    func optimizedForExport(maxDimension: CGFloat = 1920, is16by9: Bool = false) -> UIImage {
        // 1. Normalize orientation to .up so pixel coordinates are canonical
        var baseImage = self
        if imageOrientation != .up {
            let format = UIGraphicsImageRendererFormat.default()
            format.scale = 1.0
            format.opaque = true
            let renderer = UIGraphicsImageRenderer(size: size, format: format)
            baseImage = renderer.image { _ in
                self.draw(in: CGRect(origin: .zero, size: size))
            }
        }

        var sourceRect = CGRect(origin: .zero, size: baseImage.size)

        // 2. Crop to 16:9 if is16by9 is active (otherwise keep native 4:3)
        if is16by9 {
            let isLandscape = baseImage.size.width >= baseImage.size.height
            if isLandscape {
                // Target aspect: 16 / 9
                let targetHeight = baseImage.size.width * 9.0 / 16.0
                if targetHeight <= baseImage.size.height {
                    let yOffset = (baseImage.size.height - targetHeight) / 2.0
                    sourceRect = CGRect(x: 0, y: yOffset, width: baseImage.size.width, height: targetHeight)
                } else {
                    let targetWidth = baseImage.size.height * 16.0 / 9.0
                    let xOffset = (baseImage.size.width - targetWidth) / 2.0
                    sourceRect = CGRect(x: xOffset, y: 0, width: targetWidth, height: baseImage.size.height)
                }
            } else {
                // Target aspect: 9 / 16 (Portrait)
                let targetWidth = baseImage.size.height * 9.0 / 16.0
                if targetWidth <= baseImage.size.width {
                    let xOffset = (baseImage.size.width - targetWidth) / 2.0
                    sourceRect = CGRect(x: xOffset, y: 0, width: targetWidth, height: baseImage.size.height)
                } else {
                    let targetHeight = baseImage.size.width * 16.0 / 9.0
                    let yOffset = (baseImage.size.height - targetHeight) / 2.0
                    sourceRect = CGRect(x: 0, y: yOffset, width: baseImage.size.width, height: targetHeight)
                }
            }
        }

        // 3. Scale down to maxDimension
        var targetSize = sourceRect.size
        let maxSide = max(sourceRect.width, sourceRect.height)
        if maxSide > maxDimension {
            let ratio = maxDimension / maxSide
            targetSize = CGSize(
                width: max(1, round(sourceRect.width * ratio)),
                height: max(1, round(sourceRect.height * ratio))
            )
        }

        let scaleX = targetSize.width / sourceRect.width
        let scaleY = targetSize.height / sourceRect.height

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1.0
        format.opaque = true

        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        return renderer.image { _ in
            baseImage.draw(in: CGRect(
                x: -sourceRect.origin.x * scaleX,
                y: -sourceRect.origin.y * scaleY,
                width: baseImage.size.width * scaleX,
                height: baseImage.size.height * scaleY
            ))
        }
    }
}

