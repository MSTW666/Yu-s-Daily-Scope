import WidgetKit
import SwiftUI

struct Feed: Decodable { let date: String; let greeting: String?; let voice: String?; let items: [Row] }
struct Row: Decodable {
    let title: String
    let summary: String?
    let date_label: String?
    let date_iso: String?
    let date_kind: String?
    var shortDate: String {
        guard let iso = date_iso, iso.count >= 10 else { return "待确认" }
        let date = String(iso.dropFirst(5)).replacingOccurrences(of: "-", with: "/")
        let prefix = date_kind == "deadline" ? "截止 " : ""
        return prefix + date
    }
}
struct Entry: TimelineEntry { let date: Date; let feed: Feed? }
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, feed: nil) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) { completion(placeholder(in: context)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        Task {
            let url = URL(string: "https://mstw666.github.io/Yu-s-Daily-Scope/data/briefing.json")!
            let data = try? await URLSession.shared.data(from: url).0
            let feed = data.flatMap { try? JSONDecoder().decode(Feed.self, from: $0) }
            completion(Timeline(entries: [Entry(date: .now, feed: feed)], policy: .after(.now.addingTimeInterval(1800))))
        }
    }
}
struct WidgetView: View {
    let entry: Entry
    @Environment(\.widgetFamily) var family
    var body: some View {
        let expanded = family != .systemMedium
        let start = expanded ? 0 : 6
        let rows = Array((entry.feed?.items ?? []).enumerated()).dropFirst(start).prefix(family == .systemMedium ? 3 : (family == .systemLarge ? 6 : 9))
        GeometryReader { geometry in
            let full = expanded && family != .systemLarge
            let gap: CGFloat = full ? 7 : 5
            let rowHeight: CGFloat = full ? min(62, max(36, (geometry.size.height - 126 - gap * 8) / 9)) : (family == .systemLarge ? 32 : 24)
            VStack(alignment: .leading, spacing: gap) {
                HStack {
                    Text(entry.feed?.date ?? "等待同步").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color(red: 0.95, green: 0.77, blue: 0.54))
                    Spacer()
                    Text("● 已读取").font(.system(size: 10)).foregroundStyle(Color(red: 0.39, green: 0.83, blue: 0.75))
                }
                if expanded {
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.feed?.greeting ?? "小宇，早上好。").font(.system(size: full ? 24 : 20, weight: .bold)).foregroundStyle(.white).lineLimit(1)
                            Text(entry.feed?.voice ?? "今天有哪些值得留意的机会？").font(.system(size: 11)).foregroundStyle(Color(red: 0.72, green: 0.83, blue: 0.82)).lineLimit(1)
                        }
                        Spacer(minLength: 8)
                        Image("Robot").resizable().scaledToFit().frame(width: 57, height: 44)
                    }.padding(.vertical, 5)
                }
                ForEach(Array(rows), id: \.offset) { index, item in
                    HStack(spacing: 8) {
                        Text(String(format: "%02d", index + 1)).font(.system(size: 13, weight: .semibold, design: .monospaced)).foregroundStyle(Color(red: 0.39, green: 0.83, blue: 0.75)).frame(width: 22)
                        Rectangle().fill(Color.white.opacity(0.15)).frame(width: 1, height: 20)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.title).font(.system(size: full ? 14 : 12, weight: .semibold)).foregroundStyle(.white).lineLimit(1)
                            if full {
                                Text(item.summary ?? "查看完整日报了解参与条件").font(.system(size: 11)).foregroundStyle(Color(red: 0.72, green: 0.83, blue: 0.82)).lineLimit(1)
                            }
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        Text(item.shortDate).font(.system(size: 11, weight: .medium)).foregroundStyle(Color(red: 0.95, green: 0.77, blue: 0.54)).frame(width: 76, alignment: .trailing).lineLimit(1).minimumScaleFactor(0.8)
                    }.padding(.horizontal, 9).frame(height: rowHeight)
                        .background(Color.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.2, green: 0.55, blue: 0.56).opacity(0.45), lineWidth: 0.5))
                }
                if rows.isEmpty { Text("打开 App 查看日报").font(.caption).foregroundStyle(.white) }
                Spacer(minLength: 0)
                HStack { Text("把好奇变成行动。"); Spacer(); Text("全部 \(entry.feed?.items.count ?? 0) 条 ›") }.font(.system(size: 10)).foregroundStyle(Color(red: 0.65, green: 0.8, blue: 0.77))
            }
        }.environment(\.colorScheme, .dark)
            .containerBackground(LinearGradient(colors: [Color(red: 0.025, green: 0.14, blue: 0.16), Color(red: 0.02, green: 0.075, blue: 0.1)], startPoint: .topLeading, endPoint: .bottomTrailing), for: .widget)
    }
}
struct YuWidgets: Widget {
    let kind = "YuDailyScope"
    private var sizes: [WidgetFamily] {
        if #available(iOS 27.0, *) { return [.systemLarge, .systemMedium, .systemExtraLargePortrait] }
        return [.systemLarge, .systemMedium]
    }
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { WidgetView(entry: $0) }
            .configurationDisplayName("小宇日报").description("大号前六条，中号接续后三条")
            .supportedFamilies(sizes)
    }
}

@available(iOS 27.0, *)
struct FullPageBrief: Widget {
    let kind = "YuDailyScopeFullPageV3"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { WidgetView(entry: $0) }
            .configurationDisplayName("全屏日报 · 九条")
            .description("竖向超大尺寸 · 第1–9条 · v0.2")
            .supportedFamilies([.systemExtraLargePortrait])
    }
}

@main struct DailyWidgetBundle: WidgetBundle {
    var body: some Widget {
        YuWidgets()
        if #available(iOS 27.0, *) { FullPageBrief() }
    }
}

