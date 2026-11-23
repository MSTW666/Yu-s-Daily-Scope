import Foundation

enum WidgetBridge {
    static let group = "group.com.mstw666.yudailyscope"
    static var file: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?
            .appendingPathComponent("personal-brief.json")
    }
    static func read() -> Data? {
        guard let file else { return nil }
        return try? Data(contentsOf: file)
    }
    static func write(_ data: Data) throws {
        guard let file else {
            throw NSError(domain: "DailyScope", code: 1, userInfo: [NSLocalizedDescriptionKey: "当前签名未启用 App Groups，组件无法读取个人日报。"])
        }
        try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
}
