// The 30 prebuilt voices supported by Gemini TTS (name + short descriptor).
// Used by the assistant modal for selection and by the TTS service for validation.
export const GEMINI_VOICES = [
    { name: 'Zephyr',        desc: 'Bright'        },
    { name: 'Puck',          desc: 'Upbeat'        },
    { name: 'Charon',        desc: 'Informative'   },
    { name: 'Kore',          desc: 'Firm'          },
    { name: 'Fenrir',        desc: 'Excitable'     },
    { name: 'Leda',          desc: 'Youthful'      },
    { name: 'Orus',          desc: 'Firm'          },
    { name: 'Aoede',         desc: 'Breezy'        },
    { name: 'Callirrhoe',    desc: 'Easy-going'    },
    { name: 'Autonoe',       desc: 'Bright'        },
    { name: 'Enceladus',     desc: 'Breathy'       },
    { name: 'Iapetus',       desc: 'Clear'         },
    { name: 'Umbriel',       desc: 'Easy-going'    },
    { name: 'Algieba',       desc: 'Smooth'        },
    { name: 'Despina',       desc: 'Smooth'        },
    { name: 'Erinome',       desc: 'Clear'         },
    { name: 'Algenib',       desc: 'Gravelly'      },
    { name: 'Rasalgethi',    desc: 'Informative'   },
    { name: 'Laomedeia',     desc: 'Upbeat'        },
    { name: 'Achernar',      desc: 'Soft'          },
    { name: 'Alnilam',       desc: 'Firm'          },
    { name: 'Schedar',       desc: 'Even'          },
    { name: 'Gacrux',        desc: 'Mature'        },
    { name: 'Pulcherrima',   desc: 'Forward'       },
    { name: 'Achird',        desc: 'Friendly'      },
    { name: 'Zubenelgenubi', desc: 'Casual'        },
    { name: 'Vindemiatrix',  desc: 'Gentle'        },
    { name: 'Sadachbia',     desc: 'Lively'        },
    { name: 'Sadaltager',    desc: 'Knowledgeable' },
    { name: 'Sulafat',       desc: 'Warm'          },
];

export const GEMINI_VOICE_NAMES = GEMINI_VOICES.map((v) => v.name);
export const DEFAULT_GEMINI_VOICE = 'Kore';
