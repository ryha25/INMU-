import AdMaxSlot from './AdMaxSlot'

interface Props {
  onBack: () => void
}

const sections = [
  {
    title: '大富豪の基本',
    body: '手札を順番に場へ出し、誰よりも早く手札をなくすゲームです。場と同じ枚数で、より強い数字のカードを出します。通常は3が最も弱く、2が最も強いカードです。出せないときはパスし、ほかの全員がパスすると場が流れます。',
  },
  {
    title: '勝つための考え方',
    body: '強いカードだけを残すのではなく、終盤に何枚組を残すかまで考えるのがコツです。相手の残り枚数、すでに出た2やジョーカー、革命の有無を見ながら、場を流すカードと最後に上がるカードを決めましょう。',
  },
  {
    title: '革命と8切り',
    body: '同じ数字を4枚出すと革命が起こり、カードの強さが逆転します。8切りは8を含む組を出した時点で場を流せるルールです。どちらも形勢を大きく変えるので、自分の手札だけでなく相手が得をするかも確認して使います。',
  },
  {
    title: '縛りと階段',
    body: '縛りが成立すると、次の人は指定されたスートを含むカードしか出せません。階段は同じスートの連続した数字を3枚以上まとめて出す組です。手札を一度に減らせますが、返されにくい強さまで育てる判断が重要です。',
  },
  {
    title: 'INMU大富豪の特殊ルール',
    body: '810切り、1919、114514、2431、黒塗りの高級車など、通常の大富豪にはない効果があります。効果の条件はルール設定画面で確認できます。初めて遊ぶ場合はCPU対戦で一つずつ試し、場が流れる条件や手札移動のタイミングを覚えるのがおすすめです。',
  },
  {
    title: 'チャレンジモード',
    body: 'チャレンジはレベル1から順番に進みます。各レベルには「富豪以上になる」「指定カードを使う」「特定のカードを使わない」などのクリア条件があります。対局を始める前に説明とクリア条件を確認し、必要なカードをどの順番で残すか考えて挑戦してください。',
  },
]

export default function GameGuideScreen({ onBack }: Props) {
  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0a0005 100%)',
      color: '#f0e8d0',
    }}>
      <main style={{ maxWidth: 420, margin: '0 auto', padding: '18px 18px 36px' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            border: '1px solid rgba(212,175,55,.4)',
            borderRadius: 9,
            background: 'rgba(0,0,0,.35)',
            color: '#d4af37',
            padding: '7px 12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🏠 戻る
        </button>

        <header style={{ padding: '26px 2px 18px' }}>
          <div style={{ color: '#d4af37', fontSize: 12, letterSpacing: 2 }}>INMU DAIFUGO GUIDE</div>
          <h1 style={{ margin: '7px 0 10px', fontSize: 28, color: '#f7d86a' }}>遊び方・ルール解説</h1>
          <p style={{ margin: 0, color: 'rgba(240,232,208,.72)', lineHeight: 1.8, fontSize: 14 }}>
            初めての人向けに、対局の流れと手札の考え方をまとめています。
          </p>
        </header>

        {sections.map(section => (
          <section
            key={section.title}
            style={{
              marginBottom: 14,
              padding: '16px',
              border: '1px solid rgba(212,175,55,.22)',
              borderRadius: 12,
              background: 'rgba(255,255,255,.035)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', color: '#d4af37', fontSize: 18 }}>{section.title}</h2>
            <p style={{ margin: 0, lineHeight: 1.9, fontSize: 14, color: 'rgba(240,232,208,.82)' }}>
              {section.body}
            </p>
          </section>
        ))}

        <div style={{ margin: '28px auto 16px' }}>
          <div style={{ textAlign: 'center', color: 'rgba(240,232,208,.45)', fontSize: 10, marginBottom: 6 }}>
            広告
          </div>
          <AdMaxSlot size="320x100" variant={2} />
        </div>

        <p style={{ margin: '22px 4px 0', lineHeight: 1.8, fontSize: 12, color: 'rgba(240,232,208,.55)' }}>
          実際の設定は「ルール設定」で変更できます。特殊ルールを増やすほど展開が変わるため、最初は基本ルールから試してください。
        </p>
      </main>
    </div>
  )
}
