const { withAppDelegate } = require("@expo/config-plugins");

module.exports = function withIosSceneLifecycle(config) {
  return withAppDelegate(config, (result) => {
    if (result.modResults.language !== "swift") return result;

    let source = result.modResults.contents;
    source = source.replace(
      "class AppDelegate: ExpoAppDelegate {",
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
    );
    source = source.replace(`
#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`, "");
    result.modResults.contents = source;
    return result;
  });
};
