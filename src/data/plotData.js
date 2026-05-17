export const plotData = {
  // CHAPTER 1
  "ch1_start": {
    type: "explore",
    interactions: {
      "mother": "ch1_mother_start",
      "mentor": "ch1_mentor_start"
    }
  },
  "ch1_mother_start": { type: "dialog", speaker: "莱蒂西亚·波拿巴", portraitColor: "#8b5e3c", text: "拿破仑，孩子，你终于从布里埃纳军校回来了。这一年你过得如何？", next: "ch1_mother_q1" },
  "ch1_mother_q1": {
    type: "dialog", speaker: "拿破仑", portraitColor: "#1a3a5c", text: "母亲，同学们总嘲笑我的科西嘉口音，说我是外乡人。我该如何面对这些嘲讽？",
    choices: [
      { text: "用行动证明自己——在学业和军事上超越他们", impact: { strategy: 10, legacy: 5 }, next: "ch1_mother_a1_study" },
      { text: "寻求和解，与同学建立友谊", impact: { diplomacy: 10, loyalty: 5 }, next: "ch1_mother_a1_friend" },
      { text: "拒绝接受，坚守科西嘉人的身份认同", impact: { humanity: 8, strategy: 3 }, next: "ch1_mother_a1_pride" }
    ]
  },
  "ch1_mother_a1_study": { type: "dialog", speaker: "莱蒂西亚·波拿巴", portraitColor: "#8b5e3c", text: "说得好，我的孩子！波拿巴家族的荣耀需要你去争取。勤奋是你最好的武器。", next: "ch1_mother_end" },
  "ch1_mother_a1_friend": { type: "dialog", speaker: "莱蒂西亚·波拿巴", portraitColor: "#8b5e3c", text: "你有一颗宽广的心。结交盟友，日后你会明白朋友的价值无可替代。", next: "ch1_mother_end" },
  "ch1_mother_a1_pride": { type: "dialog", speaker: "莱蒂西亚·波拿巴", portraitColor: "#8b5e3c", text: "科西嘉是我们的根，永远不要忘记。但也要学会在法兰西的世界里生存。", next: "ch1_mother_end" },
  "ch1_mother_end": { type: "set_flag", flag: "ch1_talked_mother", value: true, next: "ch1_check" },

  "ch1_mentor_start": { type: "dialog", speaker: "帕斯卡尔·保利", portraitColor: "#4a3a6a", text: "年轻的拿破仑，你有军事天赋，这是显而易见的。但你志向何在？", next: "ch1_mentor_q1" },
  "ch1_mentor_q1": {
    type: "dialog", speaker: "拿破仑", portraitColor: "#1a3a5c", text: "保利将军，科西嘉刚并入法国不久，我们的命运将向何处？",
    choices: [
      { text: "我要加入法国军队，为国家效力，从中取得功名", impact: { strategy: 8, legacy: 8 }, next: "ch1_mentor_b1_france" },
      { text: "我要为科西嘉的独立而战斗", impact: { humanity: 10, loyalty: 5 }, next: "ch1_mentor_b1_corsica" },
      { text: "先积累实力，再做决断", impact: { strategy: 12, diplomacy: 5 }, next: "ch1_mentor_b1_wait" }
    ]
  },
  "ch1_mentor_b1_france": { type: "dialog", speaker: "帕斯卡尔·保利", portraitColor: "#4a3a6a", text: "务实的选择。法兰西是一个舞台，有志者自能在其中书写历史。去吧，创造你的命运！", next: "ch1_mentor_end" },
  "ch1_mentor_b1_corsica": { type: "dialog", speaker: "帕斯卡尔·保利", portraitColor: "#4a3a6a", text: "这颗爱国之心令我动容。科西嘉的自由值得为之奋斗，但形势比人强，须审时度势。", next: "ch1_mentor_end" },
  "ch1_mentor_b1_wait": { type: "dialog", speaker: "帕斯卡尔·保利", portraitColor: "#4a3a6a", text: "谨慎而睿智。时机未到时的蛰伏，是为了更好的出击。你有大将之风。", next: "ch1_mentor_end" },
  "ch1_mentor_end": { type: "set_flag", flag: "ch1_talked_mentor", value: true, next: "ch1_check" },

  "ch1_check": {
    type: "condition",
    conditions: [
      { hasFlags: ["ch1_talked_mother", "ch1_talked_mentor"], next: "ch1_end" }
    ],
    defaultNext: "ch1_start"
  },
  "ch1_end": { type: "chapter_end", nextChapter: 1 },

  // CHAPTER 2
  "ch2_start": {
    type: "explore",
    interactions: {
      "general": "ch2_gen_start",
      "junot": "ch2_junot_start"
    }
  },
  "ch2_gen_start": { type: "dialog", speaker: "卡尔托将军", portraitColor: "#3a5a3a", text: "波拿巴上尉，你提出的炮兵方案太过冒进！我们没有足够的火炮。", next: "ch2_gen_q1" },
  "ch2_gen_q1": {
    type: "dialog", speaker: "拿破仑", portraitColor: "#1a3a5c", text: "将军，土伦港的关键在于穆格雷特高地。占领那里，英国舰队就必须撤退！",
    choices: [
      { text: "请求将军全力支持，集中所有火炮强攻高地", impact: { strategy: 12, legacy: 8 }, next: "ch2_gen_a1_force" },
      { text: "提出迂回战术，避免正面强攻减少伤亡", impact: { strategy: 8, humanity: 10 }, next: "ch2_gen_a1_flank" },
      { text: "绕过将军，直接向督政府申请更多资源", impact: { diplomacy: 10, strategy: 6 }, next: "ch2_gen_a1_report" }
    ]
  },
  "ch2_gen_a1_force": { type: "dialog", speaker: "卡尔托将军", portraitColor: "#3a5a3a", text: "好吧，我批准你的计划。但如果失败，后果自负！准备进攻，波拿巴。", next: "ch2_gen_end" },
  "ch2_gen_a1_flank": { type: "dialog", speaker: "卡尔托将军", portraitColor: "#3a5a3a", text: "迂回？需要时间，但减少伤亡是值得的。你比我想象的更沉稳，上尉。", next: "ch2_gen_end" },
  "ch2_gen_a1_report": { type: "dialog", speaker: "卡尔托将军", portraitColor: "#3a5a3a", text: "你敢越级汇报！...但不得不说，你确实懂得如何运用政治手段。", next: "ch2_gen_end" },
  "ch2_gen_end": { type: "set_flag", flag: "ch2_talked_gen", value: true, next: "ch2_check" },

  "ch2_junot_start": { type: "dialog", speaker: "朱诺上尉", portraitColor: "#2a4a6a", text: "拿破仑，弟兄们都在说你的炮兵计划，大家愿意跟你冲！", next: "ch2_junot_q1" },
  "ch2_junot_q1": {
    type: "dialog", speaker: "拿破仑", portraitColor: "#1a3a5c", text: "朱诺，明天的战斗会很危险。你和弟兄们准备好了吗？",
    choices: [
      { text: "激励士气：告诉他们此战将名垂青史", impact: { loyalty: 12, legacy: 6 }, next: "ch2_junot_b1_inspire" },
      { text: "务实准备：详细部署各队战术分工", impact: { strategy: 10, loyalty: 8 }, next: "ch2_junot_b1_plan" },
      { text: "承诺战后奖赏，提高士兵积极性", impact: { loyalty: 8, diplomacy: 6 }, next: "ch2_junot_b1_reward" }
    ]
  },
  "ch2_junot_b1_inspire": { type: "dialog", speaker: "朱诺上尉", portraitColor: "#2a4a6a", text: "将军的话让我热血沸腾！弟兄们会为你赴死的，拿破仑！", next: "ch2_junot_end" },
  "ch2_junot_b1_plan": { type: "dialog", speaker: "朱诺上尉", portraitColor: "#2a4a6a", text: "明白！清晰的部署让弟兄们心里有底。我们会按计划执行。", next: "ch2_junot_end" },
  "ch2_junot_b1_reward": { type: "dialog", speaker: "朱诺上尉", portraitColor: "#2a4a6a", text: "哈！物质激励也很重要。弟兄们会更有干劲的，放心吧！", next: "ch2_junot_end" },
  "ch2_junot_end": { type: "set_flag", flag: "ch2_talked_junot", value: true, next: "ch2_check" },

  "ch2_check": {
    type: "condition",
    conditions: [
      { hasFlags: ["ch2_talked_gen", "ch2_talked_junot"], next: "ch2_battle_event" }
    ],
    defaultNext: "ch2_start"
  },
  "ch2_battle_event": { type: "event", eventName: "artillery_fire", next: "ch2_end" },
  "ch2_end": { type: "chapter_end", nextChapter: 2 },
};
