// Mandarin (Simplified Chinese) readings and answer keys for the five practice sections.
// Written for this practice app from the English readings, with the same figures. Not reviewed by a
// qualified translator; the English form stays the official consent.
// Chinese has no spaces between words, so replies are matched with spaces removed and topic words
// are matched without word boundaries.
import type { SectionId, TeachPrompt } from "./study";
import type { PracticeSection } from "./studyEs";

export const studyNameZh = "预防发作性偏头痛";

export const sectionsZh: Record<SectionId, PracticeSection> = {
  procedures: {
    title: "研究步骤和时间",
    short: "就诊次数、时间以及如何分组",
    plain:
      "诊所请您在大约 16 周内来 6 次。每次就诊大约 2 小时。在部分就诊时会抽一点血，大约 2 茶匙。由随机的方式决定您接受 Aetherol 还是安慰剂。在研究期间，您和研究医生都不知道您接受的是哪一种。",
    terms: [
      { word: "安慰剂", meaning: "不含研究药物的产品，用来比较各组。" },
      { word: "随机分配", meaning: "由一个随机过程决定您进入哪一组，不是您或医生选择的。" },
    ],
    ask: "这项研究有几次就诊，每次多长时间？",
  },
  risks: {
    title: "风险和可能的益处",
    short: "表格说可能发生的情况",
    plain:
      "Aetherol 可能引起恶心、头晕或疲劳。表格说，在以前的研究中，大约每 10 人中有 1 人出现恶心。过敏反应被描述为罕见。抽血可能留下瘀青。表格没有承诺这项研究会帮助您的偏头痛。",
    terms: [
      { word: "疲劳", meaning: "比一天结束时正常的累更严重的疲倦。" },
      { word: "不承诺益处", meaning: "这项研究是研究，不保证您会好转。" },
    ],
    ask: "表格描述了哪些风险，它承诺有益处吗？",
  },
  rights: {
    title: "您的权利以及如何退出研究",
    short: "您可以退出",
    plain:
      "您可以说不，也可以以后退出。退出不会影响您自己医生的常规医疗。研究团队可以保留已经收集的安全信息。如果有可能改变您是否继续参加的新信息，他们必须告诉您。",
    terms: [{ word: "自愿", meaning: "这是您的决定。您不必参加，也不必留下。" }],
    ask: "如果我决定退出研究会怎样？",
  },
  costs: {
    title: "费用和报酬",
    short: "您付什么、得到什么",
    plain:
      "您不需要为研究药物或研究要求的就诊付费。每完成一次诊所就诊，您会得到 50 美元。这笔钱不包括您平时的偏头痛治疗费用，也不包括额外的交通费。",
    terms: [{ word: "补偿", meaning: "表格说您每完成一次就诊会得到的报酬。" }],
    ask: "我会得到报酬吗？我需要为就诊付费吗？",
  },
  privacy: {
    title: "隐私和数据使用",
    short: "谁可以看到编码记录",
    plain:
      "在研究记录中，您的名字会被一个代码代替。申办方和监查员可以查看编码记录，以检查研究是否按计划进行。记录可能保存 15 年。公开的结果和研究的公开登记信息中不会有您的名字。",
    terms: [
      { word: "编码记录", meaning: "用研究代码而不是您的名字标记的记录。" },
      { word: "监查员", meaning: "检查记录、确认研究如何进行的人。" },
    ],
    ask: "谁能看到我的记录，会公开我的名字吗？",
  },
};

/** Mandarin answer keys. Ids match the English prompts so results line up in the handoff. */
export const teachPromptsZh: TeachPrompt[] = [
  {
    id: "randomization",
    sectionId: "procedures",
    topic: "分组",
    question: "请用您自己的话说：怎样决定您接受 Aetherol 还是安慰剂？谁知道您接受的是哪一种？",
    concepts: [
      { id: "chance", label: "分组是随机的", phrases: ["随机", "抽签", "碰运气", "不是我选", "不由我选", "不是我决定", "我不能选"] },
      { id: "blind-you", label: "不会告诉您接受的是哪一种", phrases: ["我不知道是哪", "我不会知道", "不告诉我", "不会告诉我", "我也不知道", "我和医生都不知道"] },
      { id: "blind-doctor", label: "研究医生也不知道", phrases: ["医生也不知道", "医生不知道", "医生也不会知道", "医生不会知道", "我和医生都不知道"] },
    ],
    reexplain: "由随机的方式选择 Aetherol 或安慰剂。研究期间不会告诉您是哪一种，研究医生也不知道。",
    misconceptions: [
      { id: "will-get-drug", label: "您一定会接受 Aetherol", phrases: ["一定会拿到新药", "一定会得到新药", "肯定会拿到", "肯定会得到", "我会拿到新药", "我会得到新药", "一定会用aetherol", "我会用aetherol", "每个人都会拿到"] },
      { id: "chooser", label: "有人会选择您的分组", phrases: ["我可以选", "我自己选", "我来选", "医生选", "医生决定", "医生来选", "医生挑"] },
    ],
  },
  {
    id: "withdrawal",
    sectionId: "rights",
    topic: "退出研究",
    question: "如果您决定退出研究，会发生什么？",
    concepts: [
      { id: "anytime", label: "您可以随时退出", phrases: ["随时", "任何时候", "我可以退出", "可以退出", "可以离开", "可以停止"] },
      { id: "care", label: "您自己医生的常规医疗会继续", phrases: ["我的医生", "自己的医生", "常规医疗", "平时的治疗", "医疗照顾", "继续看病", "继续给我看"] },
      { id: "safety", label: "已经收集的安全信息可能会被保留", phrases: ["安全", "已经收集", "已收集", "已经记录", "保留"] },
    ],
    reexplain: "您可以随时退出。退出不会改变您自己医生给您的常规医疗。研究团队可以保留已经记录的安全信息。",
    misconceptions: [
      { id: "cannot-leave", label: "开始后就不能退出", phrases: ["不能退出", "不可以退出", "不能离开", "不可以离开", "不能中途退出", "必须留下", "必须完成", "一定要做完", "必须坚持到最后", "退出不了"] },
      { id: "lose-care", label: "退出会让您失去常规医疗", phrases: ["失去我的医生", "失去医生", "失去医疗", "失去治疗", "没有医生了", "医生不再给我看", "医生就不管我", "不再给我治疗", "不能再看我的医生", "不能再看医生"] },
    ],
  },
  {
    id: "risk",
    sectionId: "risks",
    topic: "风险",
    question: "关于风险，以及这项研究是否会帮助您，您需要知道什么？",
    concepts: [
      { id: "effects", label: "提到恶心、头晕或疲劳", phrases: ["恶心", "头晕", "疲劳", "疲倦", "很累", "会累"] },
      { id: "benefit", label: "表格没有承诺益处", phrases: ["没有承诺", "不承诺", "不保证", "没有保证", "不一定有帮助", "可能没有帮助", "可能不会帮助", "可能帮不上", "未必有帮助"] },
    ],
    reexplain: "表格说 Aetherol 可能引起恶心、头晕或疲劳。表格也说这项研究可能不会帮助您的偏头痛。没有承诺会有益处。",
    misconceptions: [
      { id: "promised-benefit", label: "研究会帮助或治好您的偏头痛", phrases: ["会治好", "能治好", "一定会帮助", "肯定会帮助", "一定有帮助", "肯定有帮助", "保证有效", "会根治", "偏头痛会好"] },
      { id: "no-risk", label: "没有风险", phrases: ["没有风险", "没有任何风险", "无风险", "零风险", "没有副作用", "完全安全", "绝对安全"] },
    ],
  },
  {
    id: "costs",
    sectionId: "costs",
    topic: "费用和报酬",
    question: "请用您自己的话说：您需要付什么钱，您会得到多少报酬，研究不包括哪些费用？",
    concepts: [
      { id: "no-cost", label: "研究药物和要求的就诊不花您的钱", phrases: ["免费", "不用付", "不需要付", "不用花钱", "不花钱", "不收费", "不用我付"] },
      { id: "payment", label: "每完成一次就诊得到 50 美元", phrases: ["50美元", "50块", "50元", "$50", "五十美元", "五十块", "五十"] },
      { id: "usual-care", label: "研究不支付您平时的偏头痛治疗", phrases: ["平时的治疗", "平常的治疗", "常规治疗", "常规医疗", "不包括", "不支付", "不报销", "交通费", "路费"] },
    ],
    reexplain: "研究药物、安慰剂和研究要求的就诊都不花您的钱。每完成一次就诊，您会得到 50 美元。研究不支付您平时的偏头痛治疗，也不支付额外的交通费。",
    misconceptions: [
      { id: "research-is-care", label: "研究会代替或支付您的常规医疗", phrases: ["支付我所有的", "支付我的所有", "包括我所有的", "代替我的医生", "取代我的医生", "不用再看我的医生", "不需要我的医生", "支付我的常规", "包括我平时的"] },
    ],
  },
  {
    id: "privacy",
    sectionId: "privacy",
    topic: "隐私",
    question: "请用您自己的话说：谁可以看到您的研究记录？您的名字会被公开吗？",
    concepts: [
      { id: "coded", label: "记录用代码代替您的名字", phrases: ["代码", "编码", "编号", "不用我的名字", "代替我的名字"] },
      { id: "reviewers", label: "申办方、研究医生和监查员可以查看编码记录", phrases: ["申办方", "赞助方", "监查员", "监察员", "研究医生", "研究团队"] },
      { id: "not-public", label: "您的名字不会公开，也不在公开登记中", phrases: ["不会公开", "不公开", "不会公布", "不会发表", "没有我的名字", "不会有我的名字", "不会出现"] },
    ],
    reexplain: "您的记录用代码代替您的名字。申办方、研究医生和监查员可以查看这些编码记录。您的名字不会公开，也不会出现在研究的公开登记信息中。",
    misconceptions: [
      { id: "name-public", label: "您的名字会被公开", phrases: ["我的名字会公开", "我的名字会被公开", "会公布我的名字", "我的名字会被公布", "大家都能看到", "所有人都能看到", "任何人都能看到", "名字会上网"] },
    ],
  },
];

/** Mandarin words that point a question to one practice section. */
export const topicWordsZh: Record<SectionId, RegExp> = {
  procedures: /(就诊|几次|多少次|多长时间|多久|时间|抽血|安慰剂|随机|分组|几周|小时|步骤)/,
  risks: /(风险|副作用|不良反应|恶心|头晕|危险|益处|好处|帮助)/,
  rights: /(退出|离开|停止参加|不参加了|权利|自愿)/,
  costs: /(钱|付费|费用|报酬|补偿|免费|美元|支付|花费)/,
  privacy: /(隐私|名字|姓名|数据|记录|保密|公开)/,
};

/** Dose, personal treatment, approval, or cure questions in Mandarin. */
export const adviceWordsZh = /(剂量|毫克|怀孕|布洛芬|我的药|其他药|别的药|批准|fda|治愈|根治|治好|最好的治疗|什么治疗|应该吃|应该服用|应该停|应该参加|应该签|推荐|建议我)/;
