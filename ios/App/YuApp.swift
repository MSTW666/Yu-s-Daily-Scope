import SwiftUI

struct Opportunity: Codable, Identifiable {
    var id: String { title }
    let title: String
    let summary: String
    let date_label: String?
    let source_url: String?
}
struct Brief: Codable {
    let date: String
    let greeting: String
    let voice: String?
    let items: [Opportunity]
}
let endpoint = URL(string: "https://mstw666.github.io/Yu-s-Daily-Scope/data/briefing.json")!
let ink = Color(red: 0.025, green: 0.075, blue: 0.09)
let mint = Color(red: 0.39, green: 0.83, blue: 0.75)
let amber = Color(red: 0.95, green: 0.77, blue: 0.54)

@MainActor final class DailyStore: ObservableObject {
    @Published var brief: Brief?
    @Published var status = "正在读取日报"
    func refresh() async {
        if brief == nil, let saved = UserDefaults.standard.data(forKey: "brief") {
            brief = try? JSONDecoder().decode(Brief.self, from: saved)
        }
        do {
            var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData)
            request.timeoutInterval = 20
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            brief = try JSONDecoder().decode(Brief.self, from: data)
            UserDefaults.standard.set(data, forKey: "brief")
            status = "已同步"
        } catch { status = brief == nil ? "读取失败，请下拉重试" : "离线 · 显示上次日报" }
    }
}

@main struct YuApp: App {
    var body: some Scene { WindowGroup { Home().preferredColorScheme(.dark).tint(mint) } }
}
struct Home: View {
    @StateObject private var store = DailyStore()
    var body: some View {
        TabView {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        Text("DAILYSCOPE").font(.caption.monospaced()).foregroundStyle(mint)
                        Text(store.brief?.greeting ?? "小宇，早上好。").font(.largeTitle.bold())
                        Text(store.brief?.voice ?? "YU-1 正在为你查看今天的机会。").foregroundStyle(.secondary)
                        HStack { Text(store.brief?.date ?? ""); Spacer(); Text(store.status) }.font(.caption)
                        ForEach(Array((store.brief?.items ?? []).enumerated()), id: \.element.id) { index, item in
                            NavigationLink { Detail(item: item) } label: {
                                HStack(alignment: .top, spacing: 12) {
                                    Text(String(format: "%02d", index + 1)).foregroundStyle(mint.opacity(0.6))
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(item.title).font(.headline).foregroundStyle(.white)
                                        Text(item.summary).font(.subheadline).lineLimit(2).foregroundStyle(.secondary)
                                        Text(item.date_label ?? "日期待确认").font(.caption).foregroundStyle(amber)
                                    }
                                }.padding().frame(maxWidth: .infinity, alignment: .leading).background(.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 18))
                            }.buttonStyle(.plain)
                        }
                    }.padding(22)
                }.background(ink).navigationTitle("今日简报").navigationBarTitleDisplayMode(.inline)
                    .refreshable { await store.refresh() }.task { await store.refresh() }
            }.tabItem { Label("今日", systemImage: "sun.max") }
            Preferences().tabItem { Label("我的偏好", systemImage: "slider.horizontal.3") }
            CollectionDemo().tabItem { Label("立即搜集", systemImage: "sparkle.magnifyingglass") }
        }
    }
}
struct Detail: View {
    let item: Opportunity
    @AppStorage("savedTitles") private var saved = ""
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(item.title).font(.largeTitle.bold())
                Text(item.date_label ?? "日期待确认").foregroundStyle(amber).font(.title3.bold())
                Text(item.summary).font(.body).lineSpacing(8).textSelection(.enabled)
                if let value = item.source_url, let url = URL(string: value), url.scheme == "https" {
                    Link("查看官方原文 ↗", destination: url).buttonStyle(.borderedProminent)
                }
                Button(saved.components(separatedBy: "\n").contains(item.title) ? "已收藏 · 点击取消" : "收藏") {
                    var titles = saved.components(separatedBy: "\n").filter { !$0.isEmpty }
                    if titles.contains(item.title) { titles.removeAll { $0 == item.title } } else { titles.append(item.title) }
                    saved = titles.joined(separator: "\n")
                }.buttonStyle(.bordered)
            }.padding(24)
        }.background(ink).navigationTitle("逐条晨读").navigationBarTitleDisplayMode(.inline)
    }
}
struct Preferences: View {
    @AppStorage("interests") private var interests = "摄影征集、学生可投、上海周边"
    @AppStorage("cost") private var cost = "免费优先"
    var body: some View {
        NavigationStack {
            Form {
                Section("YU-1 · 最近想留意什么？") { TextField("你的兴趣", text: $interests, axis: .vertical) }
                Section("费用偏好") { Picker("费用", selection: $cost) { ForEach(["不限", "免费优先", "仅免费"], id: \.self) { Text($0) } } }
                Section { Text("偏好已保存在本机。当前读取现有公开日报，个性化采集将在后续接入。").font(.footnote) }
            }.navigationTitle("我的偏好")
        }
    }
}
