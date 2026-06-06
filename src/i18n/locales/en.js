export const en = {
  meta: {
    title: "Napoleon's Legacy",
    description: "Napoleon's Legacy is an interactive 3D history game about choices, power, and consequence.",
  },
  brand: {
    title: "Napoleon's Legacy",
    subtitle: "An Interactive 3D History Game",
    dates: "1769-1821",
    quote: '"Impossible is a word to be found only in the dictionary of fools."',
  },
  language: {
    label: 'Language',
    english: 'English',
    chinese: 'Chinese',
  },
  loading: {
    chapter: 'Deploying the chapter scene...',
    steps: [
      'Initializing the Three.js renderer...',
      'Building historical scenes...',
      'Generating character models...',
      'Loading the dialogue system...',
      'Preparing the campaign...',
      "Welcome to Napoleon's world.",
    ],
  },
  menu: {
    newGame: 'New Game',
    continue: 'Continue',
    settings: 'Settings',
    about: 'About',
    back: 'Back',
    chapterSelect: 'Select Chapter',
  },
  hud: {
    move: 'Arrows Move',
    camera: 'WASD / Drag Camera',
    interact: 'E Interact',
    menu: 'ESC Menu',
  },
  mission: {
    kicker: 'Campaign Orders',
    progress: '{complete}/{total} secured',
    compassLabel: 'Objective: {name}, {distance}',
  },
  cinematic: {
    kicker: 'Historical Theater',
    skip: 'Skip',
  },
  audio: {
    mute: 'Mute sound',
    enable: 'Enable sound',
  },
  graphics: {
    qualityLabel: 'Graphics: {quality}',
    low: 'Low',
    balanced: 'Balanced',
    cinematic: 'Cinematic',
  },
  settings: {
    title: 'Settings',
    close: 'Close settings',
    graphicsQuality: 'Graphics Quality',
    autoQuality: 'Auto Quality',
    cameraSensitivity: 'Camera Sensitivity',
    enhancedSubtitles: 'Enhanced Subtitles',
    on: 'On',
    off: 'Off',
  },
  performance: {
    recommendAutoQuality: 'Frame rate is under pressure. Auto Quality can stabilize rendering.',
    enableAuto: 'Enable Auto',
    dismiss: 'Dismiss performance recommendation',
    autoAdjusted: 'Auto Quality lowered graphics to {quality}.',
  },
  game: {
    interactPrompt: 'Talk to {name}',
    dialogueContinue: 'Click to continue',
    pause: 'Paused',
    resume: 'Resume',
    chapterMenu: 'Chapter Select',
    mainMenu: 'Main Menu',
    mobileMove: 'Move',
    mobileLook: 'Look',
  },
  chapterComplete: {
    title: '{chapter} Complete',
    choicesTitle: 'Your Choices',
    noChoices: 'No major choices were recorded in this chapter.',
    nextChapter: 'Next Chapter',
    viewSummary: 'View Summary',
  },
  summary: {
    title: 'The Legend Reaches Its End',
    choicesJourney: 'Your Path Through History',
    unfinished: 'Unfinished',
    restart: 'Restart',
  },
  about: {
    title: "About Napoleon's Legacy",
    body: 'A historical interactive game where you guide Napoleon Bonaparte from a Corsican childhood to imperial power, exile, and reflection.',
    controlsTitle: 'Controls',
    keyboard: 'Keyboard: arrow keys move, WASD adjusts the camera, E interacts, ESC pauses.',
    mobile: 'Mobile: left stick moves, right stick controls the camera.',
  },
  status: {
    complete: 'Complete',
  },
  scores: {
    strategy: 'Strategic Insight',
    diplomacy: 'Diplomacy',
    loyalty: 'Loyalty',
    legacy: 'Historical Legacy',
    humanity: 'Humanity',
  },
  endings: {
    triumph: {
      title: 'An Empire of Enduring Glory',
      text: 'With uncommon judgment and restraint, you won more than battles. The Code, institutions, and reforms you protected became a durable civil legacy.',
      icon: 'crown',
    },
    legacy: {
      title: 'A Complicated Legacy',
      text: 'Your life mixed brilliance with cost. Glory, reform, war, and ambition remain inseparable, leaving historians to argue over a figure who changed the world.',
      icon: 'sword',
    },
    tragedy: {
      title: 'A Heroic Tragedy',
      text: 'Power and ambition failed to become lasting achievement. The loneliness of Saint Helena stands as judgment on endless war, even for a life that reshaped Europe.',
      icon: 'sunset',
    },
  },
  characters: {
    napoleon: 'Napoleon',
    letizia: 'Letizia Bonaparte',
    paoli: 'Pasquale Paoli',
    carteaux: 'General Carteaux',
    junot: 'Captain Junot',
    talleyrand: 'Talleyrand',
    josephine: 'Josephine',
    berthier: 'Marshal Berthier',
    soult: 'Marshal Soult',
    murat: 'Marshal Murat',
    caulaincourt: 'Duke Caulaincourt',
    ney: 'Marshal Ney',
    grouchy: 'Marshal Grouchy',
    montholon: 'Count Montholon',
    gourgaud: 'General Gourgaud',
  },
  chapters: {
    items: [
      {
        number: 'Chapter I',
        title: 'The Boy from Corsica',
        year: '1785',
        desc: 'Young Napoleon returns from military school and faces a test of identity that will shape his life.',
      },
      {
        number: 'Chapter II',
        title: 'The Siege of Toulon',
        year: '1793',
        desc: 'In the fires of revolution, a young artillery captain finds the stage for his military genius.',
      },
      {
        number: 'Chapter III',
        title: 'Rise of the Consulate',
        year: '1799',
        desc: 'After Brumaire, Napoleon becomes First Consul and begins shaping the foundations of modern France.',
      },
      {
        number: 'Chapter IV',
        title: 'Glory at Austerlitz',
        year: '1805',
        desc: 'The Battle of the Three Emperors becomes one of the classic victories in military history.',
      },
      {
        number: 'Chapter V',
        title: 'Winter in Moscow',
        year: '1812',
        desc: 'The Russian campaign meets scorched earth and brutal cold, turning imperial ascent toward decline.',
      },
      {
        number: 'Chapter VI',
        title: 'Dusk at Waterloo',
        year: '1815',
        desc: 'The Hundred Days end in a final battle that decides Napoleon’s fate and Europe’s future.',
      },
      {
        number: 'Chapter VII',
        title: 'Saint Helena',
        year: '1821',
        desc: 'In exile, Napoleon reviews a legendary life and confronts the meaning of power, memory, and regret.',
      },
    ],
  },
  plot: {
    ch1: {
      mother: {
        start: 'Napoleon, my child, you have finally returned from Brienne. How has this year treated you?',
        q1: 'Mother, the other boys mock my Corsican accent and call me a foreigner. How should I face their scorn?',
        choices: {
          study: 'Prove myself through action, surpassing them in study and military skill.',
          friend: 'Seek reconciliation and build friendships with my classmates.',
          pride: 'Stand firm and refuse to abandon my Corsican identity.',
        },
        answers: {
          study: 'Well spoken, my child. The honor of the Bonaparte family must be earned. Diligence will be your finest weapon.',
          friend: 'You have a generous heart. Make allies, and one day you will learn that friendship is priceless.',
          pride: 'Corsica is our root, and you must never forget it. But you must also learn to survive in the world of France.',
        },
      },
      mentor: {
        start: 'Young Napoleon, your military talent is plain to see. But where does your ambition point?',
        q1: 'General Paoli, Corsica has only recently been joined to France. Where will our destiny lead?',
        choices: {
          france: 'Join the French army, serve the state, and win distinction there.',
          corsica: 'Fight for Corsican independence.',
          wait: 'Gather strength first, then decide.',
        },
        answers: {
          france: 'A practical choice. France is a stage, and the determined can write history upon it. Go and create your destiny.',
          corsica: 'That patriot heart moves me. Corsican freedom is worth fighting for, but circumstances demand judgment.',
          wait: 'Prudent and wise. Waiting for the right hour is preparation for a stronger strike. You have the bearing of a commander.',
        },
      },
    },
    ch2: {
      general: {
        start: 'Captain Bonaparte, your artillery proposal is far too bold. We do not have enough guns.',
        q1: 'General, the key to Toulon is the heights of l’Eguillette. Take them, and the British fleet must withdraw.',
        choices: {
          force: 'Ask for full support and mass every gun for an assault on the heights.',
          flank: 'Propose a flanking plan to avoid a costly frontal attack.',
          report: 'Bypass the general and request more resources from the government.',
        },
        answers: {
          force: 'Very well. I approve your plan. But if it fails, the consequences are yours. Prepare the attack, Bonaparte.',
          flank: 'A flanking move? It will take time, but fewer casualties are worth it. You are steadier than I expected, Captain.',
          report: 'You dare report over my head. And yet, I must admit, you know how to use politics.',
        },
      },
      junot: {
        start: 'Napoleon, the men are talking about your artillery plan. They are ready to charge with you.',
        q1: 'Junot, tomorrow will be dangerous. Are you and the men prepared?',
        choices: {
          inspire: 'Raise morale by telling them this battle will enter history.',
          plan: 'Prepare practically with detailed tactical assignments.',
          reward: 'Promise rewards after the battle to sharpen their resolve.',
        },
        answers: {
          inspire: 'Your words set the blood on fire. The men would die for you, Napoleon.',
          plan: 'Understood. Clear orders steady the men. We will execute the plan.',
          reward: 'Ha! Material rewards matter too. The men will be eager. Count on us.',
        },
      },
    },
    ch3: {
      talleyrand: {
        start: 'General, the coup of 18 Brumaire has succeeded. France now needs a leader with a firm hand.',
        q1: 'Talleyrand, how will the powers of Europe respond to our new government?',
        choices: {
          strong: 'Show strength and make Europe’s monarchs fear France.',
          peace: 'Seek diplomacy and peace agreements to stabilize the situation.',
          divide: 'Quietly divide the anti-French coalition and defeat them one by one.',
        },
        answers: {
          strong: 'Power speaks loudly. But endless war will drain France, General. Think carefully.',
          peace: 'A wise move. The Treaty of Luneville could give France room to breathe, and I will press it forward.',
          divide: 'Elegant. Divide and manage is the old art of great powers. You understand it well.',
        },
      },
      josephine: {
        start: 'Napoleon, every salon in Paris speaks of you. You are now the most powerful man in France.',
        q1: 'Josephine, power means responsibility. I want to know what the people truly need.',
        choices: {
          law: 'Create a civil code to protect the rights of citizens.',
          economy: 'Rebuild the economy first so French families can live better.',
          education: 'Build an education system to raise the nation’s future.',
        },
        answers: {
          law: 'The Code will be your greatest gift to history, Napoleon. It will last longer than any battle.',
          economy: 'People need bread before glory. Your concern for them will be remembered.',
          education: 'The light of learning will reach all France. Your foresight will benefit generations.',
        },
      },
    },
    ch4: {
      berthier: {
        start: 'Sire, the Russian and Austrian armies are advancing toward the Pratzen Heights. How shall we deploy?',
        q1: 'Berthier, this is the moment I have waited for. They have exposed their flank.',
        choices: {
          center: 'Launch the central breakthrough now and split the allied army.',
          feint: 'Feign retreat first, draw them in, then counterattack.',
          safe: 'Advance conservatively and secure the field step by step.',
        },
        answers: {
          center: 'Brilliant. Soult’s corps will break through the center. This will be a textbook maneuver. I will send the orders.',
          feint: 'Genius. Invite the enemy with apparent weakness, then strike. Austerlitz will become legend.',
          safe: 'A steady choice, Sire. Preserving lives is also part of victory.',
        },
      },
      soult: {
        start: 'Sire, my corps is in position and awaits your command. The men are eager.',
        q1: 'Soult, how long will you need to seize the Pratzen Heights?',
        choices: {
          fast: 'Twenty minutes. Concentrate the best troops for a rapid assault.',
          careful: 'Take an hour and advance steadily to reduce casualties.',
          split: 'Divide into two columns, one attacking and one holding support.',
        },
        answers: {
          fast: 'Understood. Twenty minutes, and Pratzen will be ours. For the Emperor, for France.',
          careful: 'Your mercy will move the soldiers, Sire. We will advance firmly and waste no lives.',
          split: 'Two columns, attack and support together. Your tactical design is remarkable.',
        },
      },
    },
    ch5: {
      murat: {
        start: 'Sire, Moscow is an empty city. The Russians burned it, and we can find no supplies.',
        q1: 'They use scorched earth against us. How should we respond?',
        choices: {
          retreat: 'Retreat immediately. Preserving the army matters most.',
          wait: 'Hold Moscow and wait for the Tsar’s envoy.',
          advance: 'Push deeper toward Saint Petersburg.',
        },
        answers: {
          retreat: 'Wise, Sire. But winter is here, and the road back will be torment.',
          wait: 'Wait? Sire, each day costs more men. The Russian winter will not wait for us.',
          advance: 'Our supply line is broken. To keep marching is to invite destruction. I beg you to reconsider.',
        },
      },
      caulaincourt: {
        start: 'Sire, I served in Saint Petersburg and know the Russians well. The Tsar will not yield.',
        q1: 'Caulaincourt, how should I negotiate with Alexander now?',
        choices: {
          peace: 'Send an envoy with sincere terms and seek a ceasefire.',
          hard: 'Use hard language and demand compensation.',
          secret: 'Open secret talks through intermediaries and leave both sides room.',
        },
        answers: {
          peace: 'Sincerity is the foundation of diplomacy. I will go, but Your Majesty must be ready to concede something.',
          hard: 'Sire, harsh words will only harden the Tsar. On his own soil, time is his ally.',
          secret: 'A clever choice. I know several trustworthy channels.',
        },
      },
    },
    ch6: {
      ney: {
        start: 'Sire, Wellington’s line is like iron. My cavalry charges cannot break it.',
        q1: 'Ney, Grouchy’s reinforcements have still not arrived. What should we do?',
        choices: {
          guard: 'Commit the Old Guard and risk everything.',
          retreat: 'Order an organized retreat and preserve strength for another day.',
          wait: 'Wait for Grouchy and do not waver.',
        },
        answers: {
          guard: 'The Guard advances. Sire, they are being driven back. The French Guard has never retreated until today.',
          retreat: 'Retreat. The word cuts like a blade. But you are right, Sire. Only the living can fight again.',
          wait: 'Wait for Grouchy. The Prussian guns are growing louder, Sire. I fear there is no time.',
        },
      },
      grouchy: {
        start: 'Sire, I pursued the Prussians, but they slipped past me and marched toward Waterloo.',
        q1: 'Grouchy, why did you fail to read their intention?',
        choices: {
          forgive: 'Forgive Grouchy. In war, anyone can misjudge.',
          blame: 'Hold him responsible. This mistake destroyed the empire.',
          analyze: 'Study the failure calmly and prepare for what may come.',
        },
        answers: {
          forgive: 'Sire, your mercy shames me. My greatest regret is failing your trust.',
          blame: 'You are right, Sire. It was my fault. I accept every consequence.',
          analyze: 'Your composure is admirable. Yes, we must all learn from this defeat, if there is still time.',
        },
      },
    },
    ch7: {
      montholon: {
        start: 'Sire, your memoirs now fill hundreds of pages. How will posterity judge your life?',
        q1: 'How will history judge me? That question has troubled me often.',
        choices: {
          legacy: 'I brought law, order, and modern institutions to France and Europe.',
          regret: 'War caused too much suffering. That is my deepest regret.',
          truth: 'History is written by victors, but truth will surface in time.',
        },
        answers: {
          legacy: 'The Napoleonic Code remains the foundation of many legal systems. Your legacy will endure, Sire.',
          regret: 'Such compassion moves me, Sire. Admitting error requires courage greater than any battle.',
          truth: 'Yes. Time is the fairest judge. Centuries from now, the world will weigh your deeds anew.',
        },
      },
      gourgaud: {
        start: 'Sire, if time could turn back, what would you choose differently?',
        q1: 'Perhaps my greatest mistake was the Russian campaign. And perhaps I fought Europe too long.',
        choices: {
          peace: 'If I could begin again, I would choose peace at my height, not endless expansion.',
          fate: 'Even if I could begin again, I would make the same choices. That was destiny.',
          listen: 'I wish I had listened more closely to those around me.',
        },
        answers: {
          peace: 'A peaceful Napoleon would have made another world. Perhaps better, perhaps quieter, Sire.',
          fate: 'Destiny. You always trusted your star. Even on this island, it still shines.',
          listen: 'Sire, you have finally spoken what many loyal friends hoped to hear.',
        },
      },
    },
  },
};
