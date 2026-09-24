#import <Capacitor/Capacitor.h>

CAP_PLUGIN(MultiCameraPlugin, "MultiCamera",
    CAP_PLUGIN_METHOD(openCamera, CAPPluginReturnPromise);
)
