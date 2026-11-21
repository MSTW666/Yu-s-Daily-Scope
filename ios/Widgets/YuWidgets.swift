import WidgetKit
import SwiftUI

struct Feed: Decodable { let date: String; let items: [Row] }
struct Row: Decodable { let title: String; let summary: String?; let date_label: String? }
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
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text("◉ 小宇日报"); Spacer(); Text(entry.feed?.date ?? "等待同步") }.font(.caption)
            if expanded { Text("小宇，早上好。").font(.title2.bold()) }
            ForEach(Array(rows), id: \.offset) { index, item in
                HStack {
                    Text(String(format: "%02d", index + 1)).foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: 5) { Text(item.title).lineLimit(1); if family != .systemLarge && expanded { Text(item.summary ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(2) } }
                    Spacer(minLength: 4)
                    Text(item.date_label ?? "待确认").font(.caption2).foregroundStyle(Color.yellow).lineLimit(1)
                }.font(.caption).padding(6).background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
            }
            if rows.isEmpty { Text(start == 6 ? "本期内容已在上方呈现" : "打开 App 查看日报").font(.caption).foregroundStyle(.secondary) }
            Spacer(minLength: 0)
        }.containerBackground(Color(red: 0.025, green: 0.075, blue: 0.09), for: .widget)
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

