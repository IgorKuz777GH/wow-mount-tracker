import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Sparkles,
  Compass,
  Trophy,
  Target,
  Zap,
  Globe,
  ExternalLink,
  Terminal,
  Filter,
  MapPin,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  HelpCircle,
  Star,
  Award,
  Layers,
  X,
} from "lucide-react";

const WOWHEAD_ICON_BASE = "https://wow.zamimg.com/images/wow/icons/large/";
const FALLBACK_MOUNT_ICON =
  "https://wow.zamimg.com/images/wow/icons/large/ability_mount_ridinghorse.jpg";

const COLLECTED_STORAGE_KEY = "wow_mount_tracker_collected_v7";
const API_PROFILE_STORAGE_KEY = "wow_mount_tracker_api_profile_v7";
const USER_CHAR_STORAGE_KEY = "wow_mount_tracker_user_char_v2";
const GOALS_STORAGE_KEY = "wow_mount_tracker_goals_v3";
const STEPS_STORAGE_KEY = "wow_mount_tracker_steps_v3";
const WOWHEAD_RU_CACHE_KEY = "wow_mount_tracker_ru_cache_v5";
const CUSTOM_DFA_STORAGE_KEY = "wow_mount_tracker_custom_dfa_v4";
const UI_SETTINGS_STORAGE_KEY = "wow_mount_tracker_ui_settings_v1";
const CATALOG_CACHE_STORAGE_KEY = "wow_mount_tracker_catalog_cache_v1";
const SYNC_META_STORAGE_KEY = "wow_mount_tracker_sync_meta_v1";

// IndexedDB helper for resilient website persistence across sessions
const IDB_NAME = "WowMountTrackerSiteDB";
const IDB_STORE = "tracker_state";

function idbSaveState(key, value) {
  try {
    if (typeof window === "undefined" || !window.indexedDB) return;
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
      } catch (e) {
        // Ignore IDB write error
      }
    };
  } catch (e) {
    // Ignore IDB open error
  }
}

function idbLoadState(key) {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined" || !window.indexedDB) {
        resolve(null);
        return;
      }
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, "readonly");
          const getReq = tx.objectStore(IDB_STORE).get(key);
          getReq.onsuccess = () => resolve(getReq.result ?? null);
          getReq.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

const SIMPLE_ARMORY_MOUNTS_URLS = [
  "https://raw.githubusercontent.com/kevinclement/SimpleArmory/master/static/data/mounts.json",
  "https://cdn.jsdelivr.net/gh/kevinclement/SimpleArmory@master/static/data/mounts.json",
];

const REALM_PRESETS = [
  { slug: "gordunni", nameRu: "Гордунни (Gordunni)", nameEn: "Gordunni (EU)" },
  {
    slug: "howling-fjord",
    nameRu: "Ревущий фьорд (Howling Fjord)",
    nameEn: "Howling Fjord (EU)",
  },
  {
    slug: "soulflayer",
    nameRu: "Свежеватель Душ (Soulflayer)",
    nameEn: "Soulflayer (EU)",
  },
  {
    slug: "ashenvale",
    nameRu: "Ясеневый лес (Ashenvale)",
    nameEn: "Ashenvale (EU)",
  },
  { slug: "azuregos", nameRu: "Азурегос (Azuregos)", nameEn: "Azuregos (EU)" },
  {
    slug: "blackscar",
    nameRu: "Черный Шрам (Blackscar)",
    nameEn: "Blackscar (EU)",
  },
  {
    slug: "booty-bay",
    nameRu: "Пиратская Бухта (Booty Bay)",
    nameEn: "Booty Bay (EU)",
  },
  {
    slug: "borean-tundra",
    nameRu: "Борейская тундра (Borean Tundra)",
    nameEn: "Borean Tundra (EU)",
  },
  {
    slug: "deathguard",
    nameRu: "Страж Смерти (Deathguard)",
    nameEn: "Deathguard (EU)",
  },
  { slug: "deepholm", nameRu: "Подземье (Deepholm)", nameEn: "Deepholm (EU)" },
  {
    slug: "eching-steppes",
    nameRu: "Дракономор (Fordragon)",
    nameEn: "Fordragon (EU)",
  },
  {
    slug: "EVERSONG",
    nameRu: "Вечная Песня (Eversong)",
    nameEn: "Eversong (EU)",
  },
  {
    slug: "galakrond",
    nameRu: "Галакронд (Galakrond)",
    nameEn: "Galakrond (EU)",
  },
  { slug: "goldrinn", nameRu: "Голдринн (Goldrinn)", nameEn: "Goldrinn (EU)" },
  { slug: "greymane", nameRu: "Седогрив (Greymane)", nameEn: "Greymane (EU)" },
  {
    slug: "lich-king",
    nameRu: "Король-лич (Lich King)",
    nameEn: "Lich King (EU)",
  },
  {
    slug: "razuvious",
    nameRu: "Разувий (Razuvious)",
    nameEn: "Razuvious (EU)",
  },
  {
    slug: "thermaplugg",
    nameRu: "Термоштепсель (Thermaplugg)",
    nameEn: "Thermaplugg (EU)",
  },
  { slug: "thunderhorn", nameRu: "Гром (Grom)", nameEn: "Grom (EU)" },
  { slug: "silvermoon", nameRu: "Silvermoon (EU)", nameEn: "Silvermoon (EU)" },
  { slug: "kazzak", nameRu: "Kazzak (EU)", nameEn: "Kazzak (EU)" },
  {
    slug: "tarren-mill",
    nameRu: "Tarren Mill (EU)",
    nameEn: "Tarren Mill (EU)",
  },
  { slug: "draenor", nameRu: "Draenor (EU)", nameEn: "Draenor (EU)" },
  { slug: "ravencrest", nameRu: "Ravencrest (EU)", nameEn: "Ravencrest (EU)" },
  {
    slug: "twisting-nether",
    nameRu: "Twisting Nether (EU)",
    nameEn: "Twisting Nether (EU)",
  },
];

// Official Russian names from ru.wowhead.com
const OFFICIAL_EN_TO_RU_MOUNT_NAMES = {
  "Wildseed Cradle": "Колыбель дикого семени",
  "Shimmermist Runner": "Мерцающий туманный бегун",
  "Swift Gloomhoof": "Стремительный мрачнокопыт",
  "Silverwind Larion": "Сереброкрылый ларион",
  "Spinemaw Gladechewer": "Иглобрюхий лесожов",
  "Arboreal Gulper": "Древесный заглот",
  "Sinrunner Blanchy": "Мертвая Бланш",
  "Slime Serpent": "Слизнюк Чумы",
  "Great Greytusk": "Большой серый секач",
  "Swift Breezestrider": "Стремительный ветробег",
  "Mottled Meadowstomper": "Пятнистый лугоступ",
  "Bloodhoof Bull": "Кровавый копытень",
  "Sapphire Riverbeast": "Сапфировое речное чудище",
  "Sunhide Gronnling": "Солнечношкурый гроннлинг",
  "Garn Nighthowl": "Гарн Ночной Вой",
  "Solar Spirehawk": "Солнечный ястреб пиков",
  "Subdued Seahorse": "Прирученный морской конек",
  "Vashj'ir Seahorse": "Морской конек Вайш'ира",
  "Red Flying Cloud": "Диск красного парящего облака",
  "Bronze Drake": "Бронзовый дракон",
  "Black Drake": "Черный дракон",
  "Twilight Drake": "Сумеречный дракон",
  "Albino Drake": "Дракон-альбинос",
  "Amani Battle Bear": "Боевой медведь Амани",
  "Ashes of Al'ar": "Пепел Ал'ара",
  Invincible: "Непобедимый",
  "Mimiron's Head": "Голова Мимирона",
  "Azure Drake": "Лазурный дракон",
  "Blue Drake": "Синий дракон",
  "Red Drake": "Красный дракон",
  "Blue Proto-Drake": "Синий протодракон",
  "Green Proto-Drake": "Зеленый протодракон",
  "Red Proto-Drake": "Красный протодракон",
  "Ironbound Proto-Drake": "Окованный железом протодракон",
  "Rusted Proto-Drake": "Ржавый протодракон",
  "Violet Proto-Drake": "Фиолетовый протодракон",
  "Plagued Proto-Drake": "Чумной протодракон",
  "Black Proto-Drake": "Черный протодракон",
  "Time-Lost Proto-Drake": "Затерянный во времени протодракон",
  "Phosphorescent Stone Drake": "Фосфоресцирующий каменный дракон",
  "Vitreous Stone Drake": "Каменный дракон камнешкур",
  "Volcanic Stone Drake": "Вулканический каменный дракон",
  "Sandstone Drake": "Песчаниковый дракон",
  "Drake of the North Wind": "Дракон Северного Ветра",
  "Drake of the East Wind": "Дракон Восточного Ветра",
  "Drake of the West Wind": "Дракон Западного Ветра",
  "Drake of the South Wind": "Дракон Южного Ветра",
  "Drake of the Four Winds": "Дракон Четырех Ветров",
  "Raven Lord": "Повелитель воронов",
  "Swift White Hawkstrider": "Стремительный белый крылобег",
  "Rivendare's Deathcharger": "Конь смерти Ривендера",
  "Fiery Warhorse": "Огненный боевой конь",
  "Onyxian Drake": "Дракон Ониксии",
  "Flametalon of Alysrazor": "Огненный коготь Алисразор",
  "Pureblood Fire Hawk": "Чистокровный огнеястреб",
  "Corrupted Fire Hawk": "Оскверненный огнеястреб",
  "Felfire Hawk": "Ястреб скверноогня",
  "Experiment 12-B": "Эксперимент 12-Б",
  "Blazing Drake": "Пылающий дракон",
  "Life-Binder's Handmaiden": "Служительница Хранительницы жизни",
  "Astral Cloud Serpent": "Астральный облачный змей",
  "Onyx Cloud Serpent": "Ониксовый облачный змей",
  "Azure Cloud Serpent": "Лазурный облачный змей",
  "Golden Cloud Serpent": "Золотистый облачный змей",
  "Jade Cloud Serpent": "Нефритовый облачный змей",
  "Crimson Cloud Serpent": "Багровый облачный змей",
  "Heavenly Onyx Cloud Serpent": "Небесный ониксовый облачный змей",
  "Heavenly Crimson Cloud Serpent": "Небесный багровый облачный змей",
  "Heavenly Golden Cloud Serpent": "Небесный золотистый облачный змей",
  "Heavenly Azure Cloud Serpent": "Небесный лазурный облачный змей",
  "Thundering Jade Cloud Serpent": "Грозовой нефритовый облачный змей",
  "Thundering Ruby Cloud Serpent": "Грозовой рубиновый облачный змей",
  "Thundering August Cloud Serpent": "Грозовой августейший облачный змей",
  "Thundering Cobalt Cloud Serpent": "Грозовой кобальтовый облачный змей",
  "Thundering Onyx Cloud Serpent": "Грозовой ониксовый облачный змей",
  "Ivory Cloud Serpent": "Облачный змей цвета слоновой кости",
  "Spawn of Horridon": "Порождение Хорридона",
  "Clutch of Ji-Kun": "Потомство Цзи-Кунь",
  "Clutch of Ha-Li": "Потомство Ха-Ли",
  "Kor'kron Juggernaut": "Кор'кронский железный исполин",
  "Kor'kron War Wolf": "Кор'кронский боевой волк",
  "Kor'kron Annihilator": "Кор'кронский аннигилятор",
  "Ironhoof Destroyer": "Разрушитель Железного Копыта",
  "Felsteel Annihilator": "Аннигилятор из оскверненной стали",
  "Shackled Ur'zul": "Скованный ур'зул",
  "Antoran Charhound": "Анторусский обугленный пес",
  "Antoran Gloomhound": "Анторусский мрачный пес",
  "Abyss Worm": "Червь бездны",
  Midnight: "Полночь",
  "Smoldering Ember Wyrm": "Тлеющий пепельный змей",
  Sharkbait: "Наживка",
  "Underrot Crawg": "Крог из Подгнилья",
  "Tomb Stalker": "Гробничный ловец",
  "Mechagon Peacekeeper": "Мехагонский миротворец",
  "Aerial Unit R-21/X": "Воздушное судно Р-21/X",
  "Glacial Tidestorm": "Ледяной шквал",
  "G.M.O.D.": "Г.М.О.Д.",
  "Ny'alotha Allseer": "Всевидящий из Ни'алоты",
  Marrowfang: "Костозуб",
  "Cartel Master's Gearglider": "Механопланер главы картеля",
  Vengeance: "Отмщение",
  "Sanctum Gloomcharger": "Мрачный скакун Святилища",
  "Zereth Overseer": "Зеретский надзиратель",
  "Riddler's Mind-Worm": "Загадочный червь разума",
  "Lucid Nightmare": "Осознанный кошмар",
  "Fathom Dweller": "Глубинный обитатель",
  "Long-Forgotten Hippogryph": "Давно забытый гиппогриф",
  "Springfur Alpaca": "Курчавая альпака",
  Mollie: "Молли",
  "Elusive Quickhoof": "Неуловимый быстрокопыт",
  "Armored Brown Bear": "Бронированный бурый медведь",
  "Traveler's Tundra Mammoth": "Тундровый мамонт путешественника",
  "Grand Expedition Yak": "Большой як для путешествий",
  "Blonde Riding Yak": "Светлый ездовой як",
  "Grey Riding Yak": "Серый ездовой як",
  "Spirit of Eche'ro": "Дух Эче'ро",
  "Fossilized Raptor": "Ископаемый ящер",
  "Bone-White Primal Raptor": "Белый изначальный ящер",
  "Red Primal Raptor": "Красный изначальный ящер",
  "Black Primal Raptor": "Черный изначальный ящер",
  "Green Primal Raptor": "Зеленый изначальный ящер",
  "Brown Wolf": "Бурый волк",
  "Dire Wolf": "Лютый волк",
  "Timber Wolf": "Лесной волк",
  "Black Wolf": "Черный волк",
  "Swift Brown Wolf": "Стремительный бурый волк",
  "Swift Gray Wolf": "Стремительный серый волк",
  "Swift Timber Wolf": "Стремительный лесной волк",
  "Emerald Raptor": "Изумрудный ящер",
  "Turquoise Raptor": "Бирюзовый ящер",
  "Violet Raptor": "Фиолетовый ящер",
  "Swift Blue Raptor": "Стремительный синий ящер",
  "Swift Olive Raptor": "Стремительный оливковый ящер",
  "Swift Orange Raptor": "Стремительный оранжевый ящер",
  "Brown Kodo": "Коричневый кодо",
  "Gray Kodo": "Серый кодо",
  "White Kodo": "Белый кодо",
  "Great Brown Kodo": "Большой коричневый кодо",
  "Great Gray Kodo": "Большой серый кодо",
  "Great White Kodo": "Большой белый кодо",
  "Great Brewfest Kodo": "Большой кодо Хмельного фестиваля",
  "Red Hawkstrider": "Красный крылобег",
  "Blue Hawkstrider": "Синий крылобег",
  "Purple Hawkstrider": "Фиолетовый крылобег",
  "Black Hawkstrider": "Черный крылобег",
  "Swift Green Hawkstrider": "Стремительный зеленый крылобег",
  "Swift Pink Hawkstrider": "Стремительный розовый крылобег",
  "Swift Purple Hawkstrider": "Стремительный фиолетовый крылобег",
  "Sunreaver Hawkstrider": "Крылобег Похитителей Солнца",
  "Sunreaver Dragonhawk": "Дракондор Похитителей Солнца",
  "Spectral Wolf": "Призрачный волк",
  "Spectral Steed": "Призрачный скакун",
  "Argent Hippogryph": "Серебряный гиппогриф",
  "Argent Warhorse": "Серебряный боевой конь",
  "Argent Charger": "Серебряный скакун",
  "Red Skeletal Horse": "Красный конь-скелет",
  "Blue Skeletal Horse": "Синий конь-скелет",
  "Brown Skeletal Horse": "Гнедой конь-скелет",
  "Black Skeletal Horse": "Черный конь-скелет",
  "Green Skeletal Warhorse": "Зеленый боевой конь-скелет",
  "Purple Skeletal Warhorse": "Лиловый боевой конь-скелет",
  "Ochre Skeletal Warhorse": "Охряный боевой конь-скелет",
  "Red Skeletal Warhorse": "Красный боевой конь-скелет",
  "White Skeletal Warhorse": "Белый боевой конь-скелет",
  "Goblin Trike": "Гоблинский трицикл",
  "Goblin Turbo-Trike": "Гоблинский турботрицикл",
  "Tawny Wind Rider": "Рыжий ветрокрыл",
  "Blue Wind Rider": "Синий ветрокрыл",
  "Green Wind Rider": "Зеленый ветрокрыл",
  "Swift Red Wind Rider": "Стремительный красный ветрокрыл",
  "Swift Green Wind Rider": "Стремительный зеленый ветрокрыл",
  "Swift Yellow Wind Rider": "Стремительный желтый ветрокрыл",
  "Swift Purple Wind Rider": "Стремительный лиловый ветрокрыл",
  "Armored Blue Wind Rider": "Бронированный синий ветрокрыл",
  "Golden Gryphon": "Золотистый грифон",
  "Ebon Gryphon": "Черный грифон",
  "Snowy Gryphon": "Белоснежный грифон",
  "Swift Blue Gryphon": "Стремительный синий грифон",
  "Swift Green Gryphon": "Стремительный зеленый грифон",
  "Swift Red Gryphon": "Стремительный красный грифон",
  "Swift Purple Gryphon": "Стремительный лиловый грифон",
  "Armored Snowy Gryphon": "Бронированный белоснежный грифон",
  "Brown Horse": "Гнедой конь",
  "Chestnut Mare": "Саврасая кобыла",
  "Black Stallion": "Черный жеребец",
  Pinto: "Пегий конь",
  "Mountain Horse": "Горный конь",
  "Swift Mountain Horse": "Стремительный горный конь",
  "Swift Brown Steed": "Стремительный гнедой рысак",
  "Swift Palomino": "Стремительный соловый рысак",
  "Swift White Steed": "Стремительный белый рысак",
  "Brown Ram": "Бурый баран",
  "Gray Ram": "Серый баран",
  "White Ram": "Белый баран",
  "Swift Brown Ram": "Стремительный бурый баран",
  "Swift Gray Ram": "Стремительный серый баран",
  "Swift White Ram": "Стремительный белый баран",
  "Swift Brewfest Ram": "Стремительный баран Хмельного фестиваля",
  "Striped Frostsaber": "Полосатый ледопард",
  "Striped Nightsaber": "Полосатый ночной саблезуб",
  "Striped Dawnsaber": "Полосатый рассветный саблезуб",
  "Spotted Frostsaber": "Пятнистый ледопард",
  "Swift Frostsaber": "Стремительный ледопард",
  "Swift Mistsaber": "Стремительный туманный саблезуб",
  "Swift Stormsaber": "Стремительный грозовой саблезуб",
  "Winterspring Frostsaber": "Ледопард Зимних Ключей",
  "Red Mechanostrider": "Красный механодолгоног",
  "Blue Mechanostrider": "Синий механодолгоног",
  "Green Mechanostrider": "Зеленый механодолгоног",
  "Unpainted Mechanostrider": "Неокрашенный механодолгоног",
  "Swift Green Mechanostrider": "Стремительный зеленый механодолгоног",
  "Swift White Mechanostrider": "Стремительный белый механодолгоног",
  "Swift Yellow Mechanostrider": "Стремительный желтый механодолгоног",
  "Brown Elekk": "Бурый элекк",
  "Gray Elekk": "Серый элекк",
  "Purple Elekk": "Фиолетовый элекк",
  "Great Blue Elekk": "Большой синий элекк",
  "Great Green Elekk": "Большой зеленый элекк",
  "Great Purple Elekk": "Большой фиолетовый элекк",
  "Green Dragon Turtle": "Зеленая драконья черепаха",
  "Black Dragon Turtle": "Черная драконья черепаха",
  "Blue Dragon Turtle": "Синяя драконья черепаха",
  "Brown Dragon Turtle": "Бурая драконья черепаха",
  "Purple Dragon Turtle": "Фиолетовая драконья черепаха",
  "Red Dragon Turtle": "Красная драконья черепаха",
  "Great Green Dragon Turtle": "Большая зеленая драконья черепаха",
  "Great Black Dragon Turtle": "Большая черная драконья черепаха",
  "Great Blue Dragon Turtle": "Большая синяя драконья черепаха",
  "Great Brown Dragon Turtle": "Большая бурая драконья черепаха",
  "Great Purple Dragon Turtle": "Большая фиолетовая драконья черепаха",
  "Great Red Dragon Turtle": "Большая красная драконья черепаха",
  "Black War Wolf": "Черный боевой волк",
  "Black War Raptor": "Черный боевой ящер",
  "Black War Kodo": "Черный боевой кодо",
  "Swift Warstrider": "Стремительный боевой крылобег",
  "Black War Bear": "Черный боевой медведь",
  "Black War Mammoth": "Черный боевой мамонт",
  "Grand Black War Mammoth": "Большой черный боевой мамонт",
  "Black War Steed": "Черный боевой рысак",
  "Black War Tiger": "Черный боевой тигр",
  "Black War Ram": "Черный боевой баран",
  "Black War Elekk": "Черный боевой элекк",
  "Black Battlestrider": "Черный боевой механодолгоног",
  "Frostwolf Howler": "Воющий волк клана Северного Волка",
  "Stormpike Battle Charger": "Боевой скакун клана Грозовой Вершины",
  "Acherus Deathcharger": "Конь смерти Акеруса",
  "Winged Steed of the Ebon Blade": "Крылатый скакун Черного Клинка",
  Felsteed: "Конь Скверны",
  Dreadsteed: "Конь погибели",
  Warhorse: "Боевой конь",
  Charger: "Скакун",
  "Thalassian Warhorse": "Талассийский боевой конь",
  "Thalassian Charger": "Талассийский скакун",
  "Sunwalker Kodo": "Кодо служителя Солнца",
  "Great Sunwalker Kodo": "Большой кодо служителя Солнца",
  "Exarch's Elekk": "Элекк экзарха",
  "Great Exarch's Elekk": "Большой элекк экзарха",
  Felsaber: "Саблезуб Скверны",
  "Onyx Netherwing Drake": "Ониксовый дракон Крыльев Пустоты",
  "Azure Netherwing Drake": "Лазурный дракон Крыльев Пустоты",
  "Cobalt Netherwing Drake": "Кобальтовый дракон Крыльев Пустоты",
  "Purple Netherwing Drake": "Фиолетовый дракон Крыльев Пустоты",
  "Veridian Netherwing Drake": "Зеленый дракон Крыльев Пустоты",
  "Violet Netherwing Drake": "Лиловый дракон Крыльев Пустоты",
  "Grotto Netherwing Drake": "Пещерный дракон Крыльев Пустоты",
  "Green Riding Nether Ray": "Зеленый верховой скат Пустоты",
  "Red Riding Nether Ray": "Красный верховой скат Пустоты",
  "Purple Riding Nether Ray": "Фиолетовый верховой скат Пустоты",
  "Silver Riding Nether Ray": "Серебряный верховой скат Пустоты",
  "Blue Riding Nether Ray": "Синий верховой скат Пустоты",
  "Cobalt War Talbuk": "Кобальтовый боевой талбук",
  "Silver War Talbuk": "Серебряный боевой талбук",
  "Tan War Talbuk": "Бурый боевой талбук",
  "White War Talbuk": "Белый боевой талбук",
  "Dark War Talbuk": "Темный боевой талбук",
  "Cobalt Riding Talbuk": "Кобальтовый верховой талбук",
  "Silver Riding Talbuk": "Серебряный верховой талбук",
  "Tan Riding Talbuk": "Бурый верховой талбук",
  "White Riding Talbuk": "Белый верховой талбук",
  "Dark Riding Talbuk": "Темный верховой талбук",
  "Cenarion War Hippogryph": "Кенарийский боевой гиппогриф",
  "Flameward Hippogryph": "Огнекрылый гиппогриф",
  "Cloudwing Hippogryph": "Облачнокрылый гиппогриф",
  "Leyfeather Hippogryph": "Гиппогриф силового пера",
  "Blazing Hippogryph": "Пылающий гиппогриф",
  "Teldrassil Hippogryph": "Тельдрассильский гиппогриф",
  "Azure Water Strider": "Лазурный водный долгоног",
  "Crimson Water Strider": "Багровый водный долгоног",
  "Amber Scorpion": "Янтарный скорпион",
  "Azure Riding Crane": "Лазурный ездовой журавль",
  "Golden Riding Crane": "Золотистый ездовой журавль",
  "Regal Riding Crane": "Царственный ездовой журавль",
  "Brown Riding Goat": "Бурый ездовой козел",
  "White Riding Goat": "Белый ездовой козел",
  "Black Riding Goat": "Черный ездовой козел",
  "Brown Riding Camel": "Бурый ездовой верблюд",
  "Tan Riding Camel": "Желтый ездовой верблюд",
  "White Riding Camel": "Белый ездовой верблюд",
  "Grey Riding Camel": "Серый ездовой верблюд",
  "Blue Shado-Pan Riding Tiger": "Синий верховой тигр Шадо-Пан",
  "Green Shado-Pan Riding Tiger": "Зеленый верховой тигр Шадо-Пан",
  "Red Shado-Pan Riding Tiger": "Красный верховой тигр Шадо-Пан",
  "Son of Galleon": "Сын Галеона",
  "Cobalt Primordial Direhorn": "Кобальтовый изначальный дикорог",
  "Amber Primordial Direhorn": "Янтарный изначальный дикорог",
  "Jade Primordial Direhorn": "Нефритовый изначальный дикорог",
  "Slate Primordial Direhorn": "Сланцевый изначальный дикорог",
  "Crimson Primal Direhorn": "Багровый изначальный дикорог",
  "Golden Primal Direhorn": "Золотистый изначальный дикорог",
  "Zandalari Direhorn": "Зандаларский дикорог",
  "Sky Golem": "Небесный голем",
  "Depleted-Kyparium Rocket": "Ракета на обедненном кипарии",
  "Geosynchronous World Spinner": "Геосинхронный вращатель мира",
  "Mechano-Hog": "Механоцикл",
  "Mekgineer's Chopper": "Чоппер механолога",
  "Chauffeured Mechano-Hog": "Механоцикл с шофером",
  "Chauffeured Mekgineer's Chopper": "Чоппер механолога с шофером",
  "Flying Machine": "Ветролет",
  "Turbo-Charged Flying Machine": "Турбоветролет",
  "Flying Carpet": "Ковер-самолет",
  "Magnificent Flying Carpet": "Великолепный ковер-самолет",
  "Frosty Flying Carpet": "Индевеющий ковер-самолет",
  "Creeping Carpet": "Ползучий ковер",
  "Leywoven Flying Carpet": "Сотканный из силовых линий ковер-самолет",
  "Jeweled Onyx Panther": "Драгоценная ониксовая пантера",
  "Ruby Panther": "Рубиновая пантера",
  "Sapphire Panther": "Сапфировая пантера",
  "Jade Panther": "Нефритовая пантера",
  "Sunstone Panther": "Пантера из солнечного камня",
  "Steelbound Devourer": "Скованный сталью пожиратель",
  "Coalfist Gronnling": "Чернокулачный гроннлинг",
  "Voidtalon of the Dark Star": "Коготь Бездны Темной Звезды",
  "Grove Warden": "Хранитель рощи",
  "Violet Spellwing": "Фиолетовый чарокрыл",
  "Uncorrupted Voidwing": "Неоскверненный змей Бездны",
  "Obsidian Worldbreaker": "Обсидиановый разрушитель миров",
  "Core Hound": "Гончая Недр",
  "Dark Iron Core Hound": "Гончая Недр из клана Черного Железа",
  Hearthsteed: "Небесный скакун",
  "Fiery Hearthsteed": "Огненный небесный скакун",
  "Sarge's Tale": "Сказка Сарджа",
  Ratstallion: "Крысоконь",
  "Llothien Prowler": "Ллотиенский рыскун",
  "Arcanist's Manasaber": "Манапард чародея",
  "Nightborne Manasaber": "Манапард ночнорожденных",
  "Highmountain Thunderhoof": "Громокопыт Крутогорья",
  "Highmountain Elderhorn": "Древний рог Крутогорья",
  "Lightforged Felcrusher": "Озаренный сокрушитель Скверны",
  "Blessed Felcrusher": "Благословенный сокрушитель Скверны",
  "Avenging Felcrusher": "Мстящий сокрушитель Скверны",
  "Glorious Felcrusher": "Славный сокрушитель Скверны",
  "Starcursed Voidstrider": "Проклятый звездами странник Бездны",
  "Mag'har Direwolf": "Маг'харский лютоволк",
  "Kul Tiran Charger": "Кул-тирасский скакун",
  "Bleakhoof Ruinstrider": "Мрачнокопытный скиталец руин",
  "Amethyst Ruinstrider": "Аметистовый скиталец руин",
  "Beryl Ruinstrider": "Берилловый скиталец руин",
  "Cerulean Ruinstrider": "Лазурный скиталец руин",
  "Russet Ruinstrider": "Рыжеватый скиталец руин",
  "Sable Ruinstrider": "Соболиный скиталец руин",
  "Umber Ruinstrider": "Тенистый скиталец руин",
  "Maddened Chaosrunner": "Обезумевший бегун Хаоса",
  "Vile Fiend": "Мерзкий бес",
  "Acid Belcher": "Кислотный рыгун",
  "Crimson Slavermaw": "Багровый слюномор",
  "Biletooth Gnasher": "Желчезубый скрежетатель",
  "Lambent Mana Ray": "Лучистый манаскат",
  "Vibrant Mana Ray": "Яркий манаскат",
  "Felglow Mana Ray": "Светящийся Скверной манаскат",
  "Darkspore Mana Ray": "Темноспоровый манаскат",
  "Scintillating Mana Ray": "Мерцающий манаскат",
  "Wandering Ancient": "Странствующий древень",
  "Soaring Spelltome": "Парящий фолиант заклинаний",
  "Infinite Timereaver": "Пожиратель времени из рода Бесконечности",
  "Yu'lei, Daughter of Jade": "Юй-лэй, Дочь Нефрита",
  "Beastlord's Irontusk": "Железноклык повелителя зверей",
  "Beastlord's Warwolf": "Боевой волк повелителя зверей",
  "Eclipse Dragonhawk": "Дракондор затмения",
  "Blue Qiraji Battle Tank": "Синий киражский боевой танк",
  "Green Qiraji Battle Tank": "Зеленый киражский боевой танк",
  "Red Qiraji Battle Tank": "Красный киражский боевой танк",
  "Yellow Qiraji Battle Tank": "Желтый киражский боевой танк",
  "Ultramarine Qiraji Battle Tank": "Ультрамариновый киражский боевой танк",
  "Black Qiraji Battle Tank": "Черный киражский боевой танк",
  "Headless Horseman's Mount": "Скакун Всадника без головы",
  "X-45 Heartbreaker": "Сердцеед X-45",
  "Swift Lovebird": "Стремительная птица любви",
  "Swift Springstrider": "Стремительный весенний долгоног",
  "Minion of Grumpus": "Прислужник Ворчуна",
  "Darkmoon Dancing Bear": "Танцующий медведь ярмарки Новолуния",
  "Swift Forest Strider": "Стремительный лесной долгоног",
  "Darkwater Skate": "Темноводный скат",
  "Sea Turtle": "Морская черепаха",
  "Riding Turtle": "Верховая черепаха",
  "Great Sea Ray": "Большой морской скат",
  "Pond Nettle": "Прудовая медуза",
  "Brinedeep Bottom-Feeder": "Глубоководный донный падальщик",
  "Renewed Proto-Drake": "Возрожденный протодракон",
  "Windborne Velocidrake": "Крылатый велоцидракон",
  "Highland Drake": "Нагорный дракон",
  "Cliffside Wylderdrake": "Скальный дикодракон",
  "Winding Slitherdrake": "Извилистый скользящий дракон",
  "Flourishing Whimsydrake": "Цветущий чудесный дракон",
  "Algarian Stormrider": "Алгарский буревестник",
  "Delver's Dirigible": "Дирижабль исследователя подземелий",
  "Delver's Gob-Trotter": "Гоб-рысак исследователя подземелий",
  "Slatestone Ramolith": "Сланцевый баранолит",
  "Shale Ramolith": "Глинистый баранолит",
  "Smoldering Cinderbee": "Тлеющая пеплопчела",
  "Soaring Meaderbee": "Парящая медопчела",
  Alunira: "Алунира",
  "Beledar's Spawn": "Порождение Беледара",
  Siesbarg: "Зисбарг",
  "Sureki Skyrazor": "Сурекийский неборез",
  "Ascendant Skyrazor": "Вознесшийся неборез",
  "Ash'adar, Harbinger of Dawn": "Аш'адар, Вестник Рассвета",
  "Celestial Steed": "Небесный скакун",
  "Winged Guardian": "Крылатый страж",
  "Heart of the Aspects": "Сердце Аспектов",
  "Enchanted Fey Dragon": "Зачарованный волшебный дракон",
  "Iron Skyreaver": "Железный небесный раздиратель",
  "Grinning Reaver": "Оскаленный разоритель",
  "Warforged Nightmare": "Выкованный для войны кошмар",
  "Armored Bloodwing": "Бронированный кровокрыл",
  "Mystic Runesaber": "Мистический рунопард",
  "Luminous Starseeker": "Светящийся звездочет",
  "Shu-Zen, the Divine Sentinel": "Шу-Дзэнь, божественный страж",
  "Vulpine Familiar": "Лисий фамильяр",
  "Sylverian Dreamer": "Сильверийский сновидец",
  "Hogrus, Swine of Good Fortune": "Хогрус, Свинья удачи",
  "Squeakers, the Trickster": "Пискун, трикстер",
  "Steamscale Incinerator": "Парочешуйчатый испепелитель",
  "Wen Lo, the River's Edge": "Вэнь Ло, Берег Реки",
  "Sunwarmed Furline": "Согретый солнцем пушистый кот",
  "Auspicious Arborwyrm": "Благоприятный древозмей",
  "Tyrael's Charger": "Скакун Тираэля",
  "Amalgam of Rage": "Слияние Ярости",
  "Inarius' Charger": "Скакун Инария",
  "Meat Wagon": "Труповозка",
  "Illidari Felstalker": "Охотник Скверны иллидари",
  "Illidari Doomhawk": "Гибельный ястреб иллидари",
  "Dread Raven": "Грозный ворон",
  "Imperial Quilen": "Императорский цийлинь",
  "Ensorcelled Everwyrm": "Заколдованный вечнозмей",
  "Anu'relos, Flame's Guidance": "Ану'релос, Наставление Пламени",
  "Dreamlight Runestag": "Рунический олень сновидений",
  "Enchanted Dreamlight Runestag": "Зачарованный рунический олень сновидений",
  "Shadeleaf Runestag": "Тенелистный рунический олень",
  "Enchanted Shadeleaf Runestag": "Зачарованный тенелистный рунический олень",
  "Wakener's Runestag": "Рунический олень пробудителя",
  "Enchanted Wakener's Runestag": "Зачарованный рунический олень пробудителя",
  "Winterborn Runestag": "Зимний рунический олень",
  "Enchanted Winterborn Runestag": "Зачарованный зимний рунический олень",
  "Ardenweald Wilderling": "Арденвельдский чащобник",
  "Autumnal Wilderling": "Осенний чащобник",
  "Summer Wilderling": "Летний чащобник",
  "Winter Wilderling": "Зимний чащобник",
  "Voyaging Wilderling": "Странствующий чащобник",
  "Amber Ardenmoth": "Янтарный арденвельдский мотылек",
  "Duskflutter Ardenmoth": "Сумеречный арденвельдский мотылек",
  "Silky Shimmermoth": "Шелковистый мерцающий мотылек",
  "Wild Dreamrunner": "Дикий бегун снов",
  "Elysian Aquilon": "Элизийский аквилон",
  "Forsworn Aquilon": "Аквилон раскольников",
  "Ascendant's Aquilon": "Аквилон перерожденного",
  "Phalynx of Courage": "Фалинкс отваги",
  "Phalynx of Humility": "Фалинкс смирения",
  "Phalynx of Loyalty": "Фалинкс верности",
  "Phalynx of Purity": "Фалинкс чистоты",
  "Eternal Phalynx of Courage": "Вечный фалинкс отваги",
  "Eternal Phalynx of Purity": "Вечный фалинкс чистоты",
  "Eternal Phalynx of Loyalty": "Вечный фалинкс верности",
  "Eternal Phalynx of Humility": "Вечный фалинкс смирения",
  Sundancer: "Солнечный танцор",
  "Ascended Skymane": "Перерожденный небогрив",
  "Maldraxxian Corpsefly": "Малдраксийская трупомуха",
  "Regal Corpsefly": "Царственная трупомуха",
  "Battlefield Swarmer": "Полевой роевик",
  "Lord of the Corpseflies": "Повелитель трупомух",
  "Armored Plaguerot Tauralus": "Бронированный чумной тауралус",
  "Plaguerot Tauralus": "Чумной тауралус",
  "War-Bred Tauralus": "Взращенный для войны тауралус",
  "Armored War-Bred Tauralus": "Бронированный взращенный для войны тауралус",
  "Bonehoof Tauralus": "Костекопытный тауралус",
  "Armored Bonehoof Tauralus": "Бронированный костекопытный тауралус",
  "Chosen Tauralus": "Избранный тауралус",
  "Armored Chosen Tauralus": "Бронированный избранный тауралус",
  "Predatory Plagueroc": "Хищный чумной рух",
  "Hulking Deathroc": "Исполинский рух смерти",
  "Bonesewn Fleshroc": "Сшитый из костей плотерух",
  "Colossal Slaughterclaw": "Колоссальный смертекоготь",
  "Lurid Bloodtusk": "Зловещий клыкокров",
  "Blisterback Bloodtusk": "Волдырный клыкокров",
  "Battle-Bound Warhound": "Скованный битвой боевой пес",
  "Bulbous Necroray": "Луковичный некроскат",
  "Infested Necroray": "Зараженный некроскат",
  "Pestilent Necroray": "Тлетворный некроскат",
  "Sinfall Gravewing": "Камнекрыл Грехопада",
  "Obsidian Gravewing": "Обсидиановый камнекрыл",
  "Pale Gravewing": "Бледный камнекрыл",
  "Mastercraft Gravewing": "Искусный камнекрыл",
  "Crypt Gargon": "Гаргон склепа",
  "Gravestone Battle Gargon": "Надгробный боевой гаргон",
  "Battle Gargon Vrednic": "Боевой гаргон Вредник",
  "Sinfall Gargon": "Гаргон Грехопада",
  "Inquisition Gargon": "Гаргон инквизиции",
  "Hopecrusher Gargon": "Гаргон-крушитель надежды",
  "Desire's Battle Gargon": "Боевой гаргон Желания",
  "Battle Gargon Silessa": "Боевой гаргон Силесса",
  "Harvester's Dredwing": "Жуткокрыл Жнеца",
  "Horrid Dredwing": "Ужасный жуткокрыл",
  "Silvertip Dredwing": "Сереброкрылый жуткокрыл",
  "Rampart Screecher": "Бастионный визгун",
  "Endmire Flyer": "Летун Топи Конца",
  "Court Sinrunner": "Придворный грехобежец",
  "Loyal Gorger": "Верный пожиратель",
  "Voracious Gorger": "Прожорливый пожиратель",
  "Chittering Animite": "Стрекочущий анимаклещ",
  "Mawsworn Charger": "Верный Утробе скакун",
  "Soulbound Gloomcharger": "Привязанный к душе мрачный скакун",
  "Fallen Charger": "Падший скакун",
  "Hand of Bahmethra": "Длань Бахметры",
  "Hand of Nilganihmaht": "Длань Нилганихмата",
  "Hand of Salaranga": "Длань Саларанги",
  "Hand of Hrestimorak": "Длань Хрестиморака",
  "Corridor Creeper": "Коридорный ползун",
  "Bound Shadehound": "Скованная темная гончая",
  "White Polar Bear": "Белый северный медведь",
  "Swift Zhevra": "Стремительная жевра",
  "X-53 Touring Rocket": "Прогулочная ракета X-53",
  "Obsidian Nightwing": "Обсидиановый ночнокрыл",
  "Cindermane Charger": "Пепельногривый скакун",
  "Emerald Hippogryph": "Изумрудный гиппогриф",
};

// Official Wowhead Russian vocabulary translator for any uncached catalog mounts
const WOWHEAD_RU_EXACT_WORDS = {
  Swift: "Стремительный",
  Great: "Большой",
  Armored: "Бронированный",
  Vicious: "Яростный",
  Prestigious: "Престижный",
  "Gladiator's": "гладиатора",
  War: "боевой",
  Battle: "боевой",
  Riding: "ездовой",
  Ancient: "Древний",
  Primal: "Изначальный",
  Primordial: "Изначальный",
  Corrupted: "Оскверненный",
  Enchanted: "Зачарованный",
  Blessed: "Благословенный",
  Cursed: "Проклятый",
  Spectral: "Призрачный",
  Ghastly: "Жуткий",
  Celestial: "Небесный",
  Astral: "Астральный",
  Heavenly: "Небесный",
  Thundering: "Грозовой",
  Fierce: "Свирепый",
  Wild: "Дикий",
  Savage: "Свирепый",
  Gilded: "Позолоченный",
  Golden: "Золотистый",
  Silver: "Серебряный",
  Bronze: "Бронзовый",
  Copper: "Медный",
  Cobalt: "Кобальтовый",
  Azure: "Лазурный",
  Crimson: "Багровый",
  Scarlet: "Алый",
  Ruby: "Рубиновый",
  Sapphire: "Сапфировый",
  Emerald: "Изумрудный",
  Jade: "Нефритовый",
  Amber: "Янтарный",
  Amethyst: "Аметистовый",
  Obsidian: "Обсидиановый",
  Onyx: "Ониксовый",
  Ivory: "Цвета слоновой кости",
  Ebon: "Черный",
  Black: "Черный",
  White: "Белый",
  Brown: "Бурый",
  Gray: "Серый",
  Grey: "Серый",
  Red: "Красный",
  Blue: "Синий",
  Green: "Зеленый",
  Yellow: "Желтый",
  Orange: "Оранжевый",
  Purple: "Фиолетовый",
  Violet: "Лиловый",
  Pink: "Розовый",
  Turquoise: "Бирюзовый",
  Albino: "Альбинос",
  Dark: "Темный",
  Pale: "Бледный",
  Lightforged: "Озаренный",
  Void: "Бездны",
  Fel: "Скверны",
  Felscorned: "Презревший Скверну",
  Frost: "Ледяной",
  Ice: "Ледяной",
  Icebound: "Окованный льдом",
  Blood: "Кровавый",
  Bloodbathed: "Омытый кровью",
  Iron: "Железный",
  Ironbound: "Окованный железом",
  Steel: "Стальной",
  Molten: "Раскаленный",
  Fiery: "Огненный",
  Blazing: "Пылающий",
  Smoldering: "Тлеющий",
  Ashen: "Пепельный",
  Shadow: "Теневой",
  Twilight: "Сумеречный",
  Dusk: "Сумеречный",
  Dawn: "Рассветный",
  Sun: "Солнечный",
  Lunar: "Лунный",
  Star: "Звездный",
  Storm: "Штормовой",
  Plague: "Чумной",
  Bone: "Костяной",
  Skeletal: "конь-скелет",
  Drake: "дракон",
  "Proto-Drake": "протодракон",
  Wyrm: "змей",
  "Cloud Serpent": "облачный змей",
  Serpent: "змей",
  Dragonhawk: "дракондор",
  Hippogryph: "гиппогриф",
  Gryphon: "грифон",
  "Wind Rider": "ветрокрыл",
  Wyvern: "виверна",
  Wolf: "волк",
  Direwolf: "лютоволк",
  Raptor: "ящер",
  Kodo: "кодо",
  Hawkstrider: "крылобег",
  Mechanostrider: "механодолгоног",
  Nightsaber: "ночной саблезуб",
  Frostsaber: "ледопард",
  Dreamsaber: "снопард",
  Manasaber: "манапард",
  Warsaber: "боевой саблезуб",
  Saber: "саблезуб",
  Tiger: "тигр",
  Panther: "пантера",
  Lion: "лев",
  Lynx: "рысь",
  Grimlynx: "мрачнорысь",
  Bear: "медведь",
  Ram: "баран",
  Ramolith: "баранолит",
  Elekk: "элекк",
  Talbuk: "талбук",
  Clefthoof: "копытень",
  Riverbeast: "речное чудище",
  Gronnling: "гроннлинг",
  Boar: "вепрь",
  Battleboar: "боевой вепрь",
  Direhorn: "дикорог",
  Pterrordax: "птеродактиль",
  Skyscreamer: "небесный крикун",
  Ravasaur: "равазавр",
  Brutosaur: "брутозавр",
  Horse: "конь",
  Warhorse: "боевой конь",
  Steed: "рысак",
  Stallion: "жеребец",
  Charger: "скакун",
  Courser: "рысак",
  Mare: "кобыла",
  Unicorn: "единорог",
  Runestag: "рунический олень",
  Dreamstag: "олень снов",
  Stag: "олень",
  Elderhorn: "древний рог",
  "Mushan Beast": "мушан",
  Mushan: "мушан",
  Yak: "як",
  Goat: "козел",
  Camel: "верблюд",
  Alpaca: "альпака",
  Mammoth: "мамонт",
  Turtle: "черепаха",
  "Dragon Turtle": "драконья черепаха",
  Seahorse: "морской конек",
  Ray: "скат",
  "Nether Ray": "скат Пустоты",
  "Mana Ray": "манаскат",
  Necroray: "некроскат",
  Waveray: "волноскат",
  Stormray: "штормовой скат",
  Crane: "журавль",
  Phoenix: "феникс",
  Raven: "ворон",
  Eagle: "орел",
  Owl: "сова",
  Peafowl: "павлин",
  Albatross: "альбатрос",
  Vulture: "стервятник",
  Roc: "рух",
  Deathroc: "рух смерти",
  Plagueroc: "чумной рух",
  Corpsefly: "трупомуха",
  Ardenmoth: "арденвельдский мотылек",
  Moth: "мотылек",
  Butterfly: "бабочка",
  Bee: "пчела",
  Cinderbee: "пеплопчела",
  Wasp: "оса",
  Scarab: "скарабей",
  Scorpion: "скорпион",
  Spider: "паук",
  Widow: "вдова",
  Bloodswarmer: "кровавый роевик",
  Swarmer: "роевик",
  Swarmite: "роевик",
  Krolusk: "кролуск",
  Aqir: "акир",
  Drone: "трутень",
  Gorm: "горм",
  Snail: "улитка",
  Slug: "слизень",
  Frog: "лягушка",
  Toad: "жаба",
  Hopper: "прыгун",
  Crocolisk: "кроколиск",
  Snapdragon: "морской варан",
  Basilisk: "василиск",
  Crab: "краб",
  Ottuk: "оттук",
  Bakar: "бакар",
  Vorquin: "ворквин",
  Ohuna: "охуна",
  Salamanther: "саламантера",
  Armoredon: "бронедон",
  Magmammoth: "магмамонт",
  Shalewing: "сланцекрыл",
  Skitterfly: "стрекотун",
  Dreamtalon: "коготь снов",
  Gargon: "гаргон",
  Tauralus: "тауралус",
  Gravewing: "камнекрыл",
  Dredwing: "жуткокрыл",
  Aquilon: "аквилон",
  Phalynx: "фалинкс",
  Wilderling: "чащобник",
  Larion: "ларион",
  Gorger: "пожиратель",
  Mawrat: "крыса Утробы",
  Deathwalker: "вестник смерти",
  "Soul Eater": "пожиратель душ",
  Ruinstrider: "скиталец руин",
  Felcrusher: "сокрушитель Скверны",
  "Ur'zul": "ур'зул",
  Infernal: "инфернал",
  Hound: "гончая",
  Charhound: "обугленный пес",
  Darkhound: "темная гончая",
  Wolfhawk: "волкоястреб",
  Felbat: "нетопырь Скверны",
  "Fel Bat": "нетопырь Скверны",
  Gearglider: "механопланер",
  Mechsuit: "мехакостюм",
  Shreddertank: "крошшер-танк",
  Shredder: "крошшер",
  Rocket: "ракета",
  "Flying Carpet": "ковер-самолет",
  Carpet: "ковер",
  "Flying Quilt": "ковер-одеяло",
  Dirigible: "дирижабль",
  Trike: "трицикл",
  Chopper: "чоппер",
  Sweeper: "метла",
};

function translateMountNameToOfficialRuFallback(nameEn) {
  if (!nameEn || typeof nameEn !== "string") return "";
  if (OFFICIAL_EN_TO_RU_MOUNT_NAMES[nameEn])
    return OFFICIAL_EN_TO_RU_MOUNT_NAMES[nameEn];
  if (/[а-яё]/i.test(nameEn)) return nameEn;

  let result = nameEn.trim();
  const sortedEntries = Object.entries(WOWHEAD_RU_EXACT_WORDS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [enWord, ruWord] of sortedEntries) {
    const escaped = enWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(regex, ruWord);
  }

  if (result !== nameEn && /[а-яё]/i.test(result)) {
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  return nameEn;
}

// Complete verified Data for Azeroth rarity dictionary
const DFA_RAW_COMPLETE_JSON = {
  "[PH] Brown Cat Mount": "0%",
  "[PH] Purple Cat Mount": "0%",
  "[PH] White Blue Cat Mount": "0%",
  "Abyss Worm": "31%",
  "Acherus Deathcharger": "91%",
  "Acid Belcher": "26%",
  "Acidic Void Creeper": "21%",
  "Admiralty Stallion": "13%",
  "Adorned Vombata": "5%",
  "Aerial Unit R-21/X": "14%",
  "Alabaster Hyena": "15%",
  "Alabaster Stormtalon": "14%",
  "Alabaster Thunderwing": "14%",
  "Albino Drake": "92%",
  "Albino Mana Ray": "23%",
  "Algarian Stormrider": "55%",
  Alunira: "7%",
  "Amalgam of Rage": "44%",
  "Amani Battle Bear": "50%",
  "Amani Blessed Bear": "10%",
  "Amani Dragonhawk": "<1%",
  "Amani Hex Bear": "0%",
  "Amani Hunting Bear": "15%",
  "Amani Sharptalon": "2%",
  "Amani Sunfeather": "13%",
  "Amani War Bear": "2%",
  "Amani Windcaller": "10%",
  "Amber Ardenmoth": "22%",
  "Amber Primordial Direhorn": "24%",
  "Amber Pterrordax": "22%",
  "Amber Scorpion": "22%",
  "Amber Shardhide": "17%",
  "Amber Skitterfly": "30%",
  "Amberback Arboon": "<1%",
  "Amethyst Mechsuit": "2%",
  "Amethyst Ruinstrider": "24%",
  "Ancestral Clefthoof": "16%",
  "Ancestral War Bear": "17%",
  "Ancient Frostsaber": "<1%",
  "Ancient Salamanther": "22%",
  "Ankoan Waveray": "11%",
  "Anointed Protostag": "29%",
  "Antoran Charhound": "35%",
  "Antoran Gloomhound": "12%",
  "Anu'relos, Flame's Guidance": "4%",
  "Anu'shalla, Shadow's Guidance": "12%",
  "Apophic Soul Crusher": "9%",
  "Aquamarine Basilisk": "28%",
  "Aquamarine Swarmite": "31%",
  "Arboreal Gulper": "44%",
  "Arboreal Pseudoshell": "25%",
  "Arcadian War Turtle": "31%",
  "Arcanist's Manasaber": "42%",
  "Arcanovoid Construct": "19%",
  "Arcberry Manasaber": "30%",
  "Archmage's Felscorned Disc": "30%",
  "Archmage's Great Raven": "4%",
  "Archmage's Prismatic Disc": "17%",
  "Arctic Wolf": "<1%",
  "Ardenweald Wilderling": "58%",
  "Argent Charger": "4%",
  "Argent Hippogryph": "11%",
  "Argent Warhorse": "10%",
  "Armored Bloodwing": "33%",
  "Armored Blue Dragonhawk": "35%",
  "Armored Blue Wind Rider": "34%",
  "Armored Bonehoof Tauralus": "8%",
  "Armored Brown Bear": "43%",
  "Armored Chosen Tauralus": "5%",
  "Armored Frostboar": "17%",
  "Armored Frostwolf": "12%",
  "Armored Golden Pterrordax": "22%",
  "Armored Irontusk": "8%",
  "Armored Plaguerot Tauralus": "54%",
  "Armored Razorback": "14%",
  "Armored Razzashi Raptor": "18%",
  "Armored Red Dragonhawk": "35%",
  "Armored Siege Kodo": "4%",
  "Armored Skyscreamer": "9%",
  "Armored Snowy Gryphon": "34%",
  "Armored Vorquin Leystrider": "33%",
  "Armored War-Bred Tauralus": "43%",
  "Ascendant Skyrazor": "4%",
  "Ascendant's Aquilon": "14%",
  "Ascended Skymane": "3%",
  "Ash'adar, Harbinger of Dawn": "50%",
  "Ashen Dreadglider": "7%",
  "Ashen Pandaren Phoenix": "7%",
  "Ashenvale Chimaera": "16%",
  "Ashes of Al'ar": "33%",
  "Ashes of Belo'ren": "2%",
  "Ashhide Mushan Beast": "5%",
  "Ashplague Fel Bat": "31%",
  "Asset Advocator": "<1%",
  "Astral Aurochs": "16%",
  "Astral Cloud Serpent": "36%",
  "Astral Emperor's Serpent": "22%",
  "Astral Gladiator's Fel Bat": "<1%",
  "Aubergine Warturkey": "4%",
  "Augmented Stormray": "3%",
  "August Phoenix": "47%",
  "Auriferous Venomfang": "9%",
  "Auspicious Arborwyrm": "27%",
  "Autumnal Wilderling": "16%",
  "Autumnal Witchwick's Rider": "<1%",
  "Avenging Felcrusher": "26%",
  "Awakened Mindborer": "16%",
  "Azshari Bloatray": "6%",
  "Azure Cloud Serpent": "45%",
  "Azure Drake": "27%",
  "Azure Netherwing Drake": "28%",
  "Azure Riding Crane": "31%",
  "Azure Skitterfly": "21%",
  "Azure Void Flyer": "39%",
  "Azure Water Strider": "35%",
  "Azure Worldchiller": "50%",
  "Azureshell Krolusk": "13%",
  "Badlands Buzzard": "17%",
  "Ballistic Bronco": "8%",
  "Ban-Lu, Grandmaster's Companion": "17%",
  "Battle Gargon Silessa": "3%",
  "Battle Gargon Vrednic": "45%",
  "Battle-Bound Warhound": "25%",
  "Battle-Hardened Aquilon": "5%",
  "Battlefield Swarmer": "5%",
  "Battlelord's Bloodthirsty War Wyrm": "18%",
  "Beastlord's Irontusk": "11%",
  "Beastlord's Warwolf": "16%",
  "Beledar's Spawn": "11%",
  "Beryl Ruinstrider": "23%",
  "Beryl Shardhide": "11%",
  "Bestowed Ohuna Spotter": "8%",
  "Bestowed Ottuk Vanguard": "6%",
  "Bestowed Sandskimmer": "7%",
  "Bestowed Thunderspine Packleader": "6%",
  "Bestowed Trawling Mammoth": "7%",
  "Big Battle Bear": "21%",
  "Big Blizzard Bear": "<1%",
  "Big Slick in the City": "5%",
  "Bilebound Ur'zul": "12%",
  "Biletooth Gnasher": "32%",
  "Bilgewater Bombardier": "3%",
  "Bilgewater X-TREME Firework Rocket": "24%",
  "Black Battlestrider": "45%",
  "Black Dragon Turtle": "50%",
  "Black Drake": "62%",
  "Black Hawkstrider": "62%",
  "Black Malice": "<1%",
  "Black Nightsaber": "<1%",
  "Black Primal Raptor": "32%",
  "Black Proto-Drake": "<1%",
  "Black Qiraji Battle Tank": "<1%",
  "Black Qiraji War Tank": "<1%",
  "Black Ram": "<1%",
  "Black Riding Goat": "24%",
  "Black Riding Yak": "24%",
  "Black Serpent of N'Zoth": "26%",
  "Black Skeletal Horse": "65%",
  "Black Stallion": "66%",
  "Black War Bear": "25%",
  "Black War Elekk": "43%",
  "Black War Kodo": "45%",
  "Black War Mammoth": "28%",
  "Black War Ram": "46%",
  "Black War Raptor": "46%",
  "Black War Steed": "46%",
  "Black War Tiger": "50%",
  "Black War Wolf": "46%",
  "Black Wolf": "66%",
  "Black-Furred Bakar": "4%",
  Blackpaw: "17%",
  "Blackrock Warsaber": "33%",
  "Blacksteel Battleboar": "19%",
  "Blackwater Bonecrusher": "2%",
  "Blackwater Shredder Deluxe Mk 2": "5%",
  "Blackwater X-TREME Firework Rocket": "17%",
  "Blazing Drake": "15%",
  "Blazing Hippogryph": "40%",
  "Bleakhoof Ruinstrider": "37%",
  "Blessed Amani Burrower": "11%",
  "Blessed Felcrusher": "27%",
  "Blisterback Bloodtusk": "4%",
  "Blonde Riding Yak": "41%",
  "Bloodbathed Frostbrood Vanquisher": "33%",
  "Bloodfang Widow": "2%",
  "Bloodflank Charger": "23%",
  "Bloodgorged Crawg": "8%",
  "Bloodgorged Hunter": "13%",
  "Bloodhoof Bull": "17%",
  "Bloodhunter Fel Bat": "33%",
  "Bloodthirsty Dreadwing": "7%",
  "Bloodtooth Mana Ray": "23%",
  "Bloody Skyscreamer": "23%",
  "Blossomback Arboon": "<1%",
  "Blossombranch Groveglider": "4%",
  "Blossoming Dreamstag": "32%",
  "Blue Barry": "12%",
  "Blue Dragon Turtle": "49%",
  "Blue Dragonhawk": "49%",
  "Blue Drake": "37%",
  "Blue Hawkstrider": "58%",
  "Blue Marsh Hopper": "2%",
  "Blue Mechanostrider": "55%",
  "Blue Proto-Drake": "22%",
  "Blue Qiraji Battle Tank": "63%",
  "Blue Riding Nether Ray": "24%",
  "Blue Shado-Pan Riding Tiger": "32%",
  "Blue Skeletal Horse": "67%",
  "Blue Wind Rider": "50%",
  "Blue-Chip Shreddertank": "<1%",
  "Blushing Witchwick's Rider": "<1%",
  "Bone-White Primal Raptor": "22%",
  "Bonehoof Tauralus": "2%",
  "Bonesewn Fleshroc": "5%",
  "Bonesteed of Bloodshed": "30%",
  "Bonesteed of Oblivion": "31%",
  "Bonesteed of Plague": "30%",
  "Bonesteed of Triumph": "32%",
  "Boulder Hauler": "11%",
  "Bound Blizzard": "5%",
  "Bound Shadehound": "3%",
  "Brawler's Burly Basilisk": "10%",
  "Brawler's Burly Mushan Beast": "9%",
  "Brawlin' Bruno": "8%",
  "Breath of Blight": "27%",
  "Breath of Ruin": "18%",
  "Breezestrider Stallion": "5%",
  "Brewfest Bomber": "10%",
  "Brewfest Ram": "<1%",
  "Brilliant Direbeak": "6%",
  "Brilliant Petalwing": "4%",
  "Brilliant Sunburst Peafowl": "39%",
  "Brimstone Courser": "31%",
  "Brinedeep Bottom-Feeder": "10%",
  "Bristling Hellboar": "9%",
  "Broken Highland Mustang": "14%",
  "Bronze Aquilon": "9%",
  "Bronze Corpsefly": "6%",
  "Bronze Drake": "68%",
  "Bronze Goblin Waveshredder": "2%",
  "Bronze Gravewing": "8%",
  "Bronze Helicid": "4%",
  "Bronze Vorquin": "39%",
  "Bronze Wilderling": "6%",
  "Bronzewing Vespoid": "3%",
  "Broodling of Sinestra": "15%",
  "Brown Dragon Turtle": "48%",
  "Brown Elekk": "62%",
  "Brown Horse": "63%",
  "Brown Kodo": "55%",
  "Brown Ram": "56%",
  "Brown Riding Camel": "36%",
  "Brown Riding Goat": "26%",
  "Brown Scouting Ottuk": "22%",
  "Brown Skeletal Horse": "61%",
  "Brown War Ottuk": "17%",
  "Brown Wolf": "63%",
  "Brown-Furred Spiky Bakar": "34%",
  Bruce: "11%",
  "Brutal Nether Drake": "<1%",
  "Bulbous Necroray": "11%",
  Buzz: "5%",
  "Calamitous Carrion": "39%",
  "Calescent Shalewing": "9%",
  "Callow Flayedwing": "11%",
  "Captured Swampstalker": "4%",
  "Caravan Hyena": "42%",
  "Carcinized Zerethsteed": "16%",
  "Carmine Witchwick's Rider": "0%",
  "Cartel Master's Gearglider": "25%",
  "Cataclysmic Gladiator's Twilight Drake": "<1%",
  "Cataloged Shalewing": "23%",
  "Caustic Venomfang": "6%",
  "Celestial Steed": "53%",
  "Cenarion War Hippogryph": "27%",
  "Cerulean Deathwalker": "3%",
  "Cerulean Hawkstrider": "5%",
  "Cerulean Prideclaw": "14%",
  "Cerulean Ruinstrider": "24%",
  "Cerulean Sporeglider": "7%",
  "Challenger's War Yeti": "5%",
  "Champion's Treadblade": "10%",
  "Chaos-Forged Dreadwing": "4%",
  "Chaos-Forged Gryphon": "4%",
  "Chaos-Forged Hippogryph": "4%",
  "Chaos-Forged Wind Rider": "4%",
  Charger: "55%",
  "Charming Courier": "31%",
  "Chauffeured Mechano-Hog": "42%",
  "Chauffeured Mekgineer's Chopper": "42%",
  "Chestnut Courser": "31%",
  "Chestnut Mare": "70%",
  "Child of Torcali": "8%",
  "Chittering Animite": "18%",
  "Chosen Tauralus": "5%",
  "Chrono Corsair": "32%",
  "Cinder-Plumed Highland Gryphon": "35%",
  "Cindermane Charger": "54%",
  "Cindertuft Groveglider": "4%",
  "Clayscale Hornstrider": "10%",
  "Cliffside Wylderdrake": "95%",
  "Cloudborn Razorwing": "26%",
  "Cloudwing Hippogryph": "30%",
  "Clutch of Ha-Li": "6%",
  "Clutch of Ji-Kun": "27%",
  "Coalfist Gronnling": "67%",
  "Cobalt Dragonhawk": "5%",
  "Cobalt Juggernaut": "25%",
  "Cobalt Netherwing Drake": "27%",
  "Cobalt Phase-Hunter": "8%",
  "Cobalt Primordial Direhorn": "18%",
  "Cobalt Pterrordax": "17%",
  "Cobalt Riding Talbuk": "26%",
  "Cobalt Shalewing": "2%",
  "Cobalt War Talbuk": "26%",
  "Coldflame Cormaera": "37%",
  "Coldflame Infernal": "43%",
  "Coldflame Tempest": "29%",
  "Colossal Ebonclaw Mawrat": "27%",
  "Colossal Plaguespew Mawrat": "6%",
  "Colossal Slaughterclaw": "18%",
  "Colossal Soulshredder Mawrat": "13%",
  "Colossal Umbrahide Mawrat": "15%",
  "Colossal Wraithbound Mawrat": "10%",
  "Comfy Bel'ameth Flying Quilt": "48%",
  "Comfy Silvermoon Flying Quilt": "28%",
  "Compass Rose": "17%",
  "Conqueror's Scythemaw": "3%",
  "Contained Stormarion Defender": "23%",
  "Convalescent Carrion": "28%",
  "Copper-Maned Quilen": "12%",
  "Coral-Stalker Waveray": "<1%",
  "Coralscale Salamanther": "7%",
  "Core Hound": "54%",
  "Corridor Creeper": "21%",
  "Corroded Soul Crusher": "14%",
  "Corrupted Dreadwing": "23%",
  "Corrupted Fire Hawk": "39%",
  "Corrupted Gladiator's Proto-Drake": "<1%",
  "Corrupted Hippogryph": "<1%",
  "Corrupted Swarmer": "<1%",
  "Corruption of the Aspects": "7%",
  "Cosmic Gladiator's Soul Eater": "<1%",
  "Court Sinrunner": "18%",
  "Craghorn Chasm-Leaper": "10%",
  "Cragstepper Crest-Horn": "1%",
  "Creeping Carpet": "16%",
  "Crested Aqua Leafmimic": "17%",
  "Crested Ember Leafmimic": "28%",
  "Crested Verdant Leafmimic": "15%",
  "Crimson Armored Growler": "5%",
  "Crimson Cloud Serpent": "10%",
  "Crimson Deathcharger": "18%",
  "Crimson Dragonhawk": "22%",
  "Crimson Gladiator's Drake": "<1%",
  "Crimson Glimmerfur": "40%",
  "Crimson Lupine": "5%",
  "Crimson Mudnose": "25%",
  "Crimson Pandaren Phoenix": "7%",
  "Crimson Primal Direhorn": "12%",
  "Crimson Shardhide": "12%",
  "Crimson Shreddertank": "40%",
  "Crimson Silvermoon Hawkstrider": "16%",
  "Crimson Slavermaw": "30%",
  "Crimson Tidestallion": "13%",
  "Crimson Venomfang": "1%",
  "Crimson Vorquin": "40%",
  "Crimson Water Strider": "4%",
  "Crowd Pummeler 2-30": "<1%",
  "Cruel Gladiator's Storm Dragon": "<1%",
  "Crusader's Black Warhorse": "<1%",
  "Crusader's Direhorn": "19%",
  "Crusader's White Warhorse": "<1%",
  "Crusty Crawler": "32%",
  "Crypt Gargon": "50%",
  "Cryptic Aurelid": "8%",
  "Curious Crystalsniffer": "3%",
  "Curious Slateback": "7%",
  "Cyan Glowmite": "24%",
  "Dapple Gray": "10%",
  "Dark Iron Core Hound": "42%",
  "Dark Phoenix": "58%",
  "Dark Riding Talbuk": "20%",
  "Dark War Talbuk": "24%",
  "Darkened Vombata": "3%",
  "Darkforge Ram": "15%",
  "Darkfuse Chompactor": "13%",
  "Darkfuse Demolisher": "6%",
  "Darkfuse Spy-Eye": "5%",
  Darkmaul: "8%",
  "Darkmoon Dancing Bear": "20%",
  "Darkmoon Dirigible": "8%",
  "Darkspear Raptor": "7%",
  "Darkspore Mana Ray": "37%",
  "Darkwarren Hardshell": "19%",
  "Darkwater Skate": "19%",
  "Darnassian Nightsaber": "9%",
  "Dashing Windsteed": "22%",
  "Dauntless Duskrunner": "9%",
  "Dauntless Imperial Lynx": "21%",
  "Dawnforge Ram": "17%",
  "Daystorm Windsteed": "21%",
  "Dazar'alor Windreaver": "7%",
  "Deadly Gladiator's Frost Wyrm": "<1%",
  "Deathlord's Vilebrood Vanquisher": "19%",
  Deathrunner: "26%",
  "Deathtusk Felboar": "19%",
  "Deepcoral Snapdragon": "16%",
  "Deepstar Aurelid": "9%",
  Delugen: "23%",
  "Delver's Arcane Golem": "15%",
  "Delver's Dirigible": "79%",
  "Delver's Gob-Trotter": "57%",
  "Delver's Mana-Skimmer": "42%",
  "Demonic Gladiator's Storm Dragon": "<1%",
  "Depleted-Kyparium Rocket": "12%",
  Depthstalker: "64%",
  "Desertwing Hunter": "6%",
  "Desire's Battle Gargon": "2%",
  "Diamond Mechsuit": "41%",
  "Dire Wolf": "70%",
  "Divine Kiss of Ohn'ahra": "9%",
  "Domesticated Razorback": "14%",
  "Dominant Gladiator's Storm Dragon": "<1%",
  "Draconic Gladiator's Drake": "<1%",
  "Drake of the East Wind": "24%",
  "Drake of the Four Winds": "5%",
  "Drake of the North Wind": "27%",
  "Drake of the South Wind": "15%",
  "Drake of the West Wind": "19%",
  "Dread Gladiator's Proto-Drake": "<1%",
  "Dread Raven": "24%",
  Dreadsteed: "90%",
  "Dreamlight Runestag": "68%",
  "Dune Scavenger": "10%",
  "Dusk Grimlynx": "41%",
  "Dusk-Painted Sun Roc": "19%",
  "Duskbrute Harrower": "2%",
  "Duskflutter Ardenmoth": "20%",
  "Dusklight Razorwing": "16%",
  "Duskwing Ohuna": "19%",
  "Dusky Waycrest Gryphon": "4%",
  "Dustmane Direwolf": "12%",
  "Dusty Rockhide": "10%",
  "Earthen Ordinant's Ramolith": "13%",
  "Ebon Gryphon": "50%",
  "Echo of Aln'sharan": "1%",
  "Eclipse Dragonhawk": "20%",
  "Elder Glowmite": "7%",
  "Elusive Emerald Hawkstrider": "10%",
  "Elusive Quickhoof": "9%",
  "Elven Arcane Guardian": "21%",
  "Elysian Aquilon": "56%",
  "Emerald Drake": "8%",
  "Emerald Hawkstrider": "34%",
  "Emerald Hippogryph": "6%",
  "Emerald Pandaren Phoenix": "7%",
  "Emerald Raptor": "62%",
  "Emerald Skyfang": "<1%",
  "Emerald Snail": "34%",
  "Enchanted Dreamlight Runestag": "52%",
  "Enchanted Fey Dragon": "16%",
  "Enchanted Shadeleaf Runestag": "61%",
  "Enchanted Spellweave Carpet": "16%",
  "Enchanted Wakener's Runestag": "4%",
  "Enchanted Winterborn Runestag": "6%",
  "Endmire Flyer": "4%",
  "Ensorcelled Everwyrm": "63%",
  "Enterprising Shreddertank": "22%",
  "Eternal Gladiator's Soul Eater": "<1%",
  "Eternal Phalynx of Courage": "51%",
  "Eternal Phalynx of Humility": "3%",
  "Eternal Phalynx of Loyalty": "3%",
  "Eternal Phalynx of Purity": "58%",
  "Eve's Ghastly Rider": "35%",
  "Evening Sun Dreamsaber": "33%",
  "Exarch's Elekk": "35%",
  "Exodar Elekk": "7%",
  "Expedition Bloodswarmer": "13%",
  "Experiment 12-B": "14%",
  "Explorer's Dunetrekker": "10%",
  "Explorer's Jungle Hopper": "7%",
  "Explorer's Stonehide Packbeast": "8%",
  Fabious: "5%",
  "Fallen Charger": "10%",
  "Fantastical Goblin Waveshredder": "5%",
  "Farseer's Felscorned Tempest": "31%",
  "Farseer's Raging Tempest": "18%",
  "Fathom Dweller": "19%",
  "Fearless Gladiator's Storm Dragon": "<1%",
  "Feathered Windsurfer": "28%",
  "Fel Iron Juggernaut": "24%",
  "Fel-Scarred Mana Ray": "23%",
  "Felblaze Infernal": "29%",
  "Felborn Cormaera": "2%",
  "Felcrystal Scorpion": "22%",
  Feldrake: "34%",
  "Felfire Hawk": "46%",
  "Felglow Mana Ray": "37%",
  Felsaber: "87%",
  "Felscorned Grandmaster's Companion": "29%",
  "Felscorned Highlord's Charger": "31%",
  "Felscorned Netherlord's Dreadsteed": "31%",
  "Felscorned Vilebrood Vanquisher": "30%",
  "Felscorned War Wyrm": "31%",
  "Felscorned Wolfhawk": "30%",
  "Felslate Basilisk": "29%",
  Felsteed: "91%",
  "Felsteel Annihilator": "12%",
  "Felstorm Dragon": "23%",
  "Ferocious Gladiator's Storm Dragon": "<1%",
  "Ferocious Jawcrawler": "31%",
  "Fierce Gladiator's Storm Dragon": "<1%",
  "Fierce Grimlynx": "9%",
  "Fierce Razorwing": "11%",
  "Fiery Dragonhawk": "16%",
  "Fiery Hearthsteed": "33%",
  "Fiery Warhorse": "22%",
  "Flame-Painted Sun Roc": "25%",
  "Flametalon of Alysrazor": "30%",
  "Flameward Hippogryph": "20%",
  "Flarendo the Furious": "11%",
  "Flourishing Whimsydrake": "75%",
  "Fluffy Comfy Flying Quilt": "13%",
  "Flying Carpet": "39%",
  "Flying Machine": "36%",
  "Forest Windsteed": "21%",
  "Forged Gladiator's Fel Bat": "<1%",
  "Forged Spiteflyer": "6%",
  "Forsaken Warhorse": "9%",
  "Forsaken's Grotesque Charger": "32%",
  "Forsworn Aquilon": "13%",
  "Fossilized Raptor": "22%",
  "Frayfeather Hippogryph": "27%",
  "Frenzied Feltalon": "26%",
  "Frenzied Shredclaw": "2%",
  "Frightened Kodo": "4%",
  "Frost Ram": "<1%",
  "Frostbrood Proto-Wyrm": "36%",
  "Frostfall Groveglider": "4%",
  "Frostplains Battleboar": "8%",
  "Frostshard Infernal": "31%",
  "Frostwolf Howler": "19%",
  "Frostwolf Snarler": "12%",
  "Frosty Flying Carpet": "16%",
  "Fur-endship Fox": "37%",
  "Furious Gladiator's Frost Wyrm": "<1%",
  "G.M.O.D.": "11%",
  "Galactic Gladiator's Goredrake": "<1%",
  "Gargantuan Grrloc": "9%",
  "Garn Nighthowl": "61%",
  "Garn Steelmaw": "5%",
  "Garnet Razorwing": "6%",
  "Garnet Ruinstrider": "22%",
  "Geargrinder Mk. 11": "6%",
  "Genesis Crawler": "6%",
  "Geosynchronous World Spinner": "12%",
  "Ghastly Charger": "38%",
  "Ghastly Ur'zul": "26%",
  "Giant Coldsnout": "5%",
  "Giant Grrloc": "7%",
  "Gigantic Grrloc": "18%",
  "Giganto Manis": "8%",
  "Gilded Prowler": "16%",
  "Gilded Ravasaur": "19%",
  "Gilded Riding Crane": "24%",
  "Gilnean Prowler": "37%",
  "Gilneas Loyalist's Rouncey": "18%",
  "Ginormous Grrloc": "15%",
  "Glacial Tidestorm": "21%",
  "Gleaming Moonbeast": "15%",
  "Gloombough Groveglider": "4%",
  "Gloomdark Nightmare": "35%",
  "Glorious Felcrusher": "27%",
  "Gnomeregan Mechanostrider": "7%",
  "Goblin Trike": "55%",
  "Goblin Turbo-Trike": "49%",
  "Gold-Toed Albatross": "19%",
  "Golden Cloud Serpent": "44%",
  "Golden Discus": "28%",
  "Golden Gryphon": "51%",
  "Golden King": "44%",
  "Golden Primal Direhorn": "12%",
  "Golden Regal Scarab": "2%",
  "Golden Riding Crane": "28%",
  "Golden Sunrunner": "32%",
  Goldenmane: "6%",
  "Goldplate Bufonid": "3%",
  "Gooey Snailemental": "4%",
  Gorespine: "5%",
  "Gorestrider Gronnling": "5%",
  "Grand Armored Gryphon": "12%",
  "Grand Armored Wyvern": "11%",
  "Grand Black War Mammoth": "23%",
  "Grand Expedition Yak": "56%",
  "Grand Gryphon": "18%",
  "Grand Ice Mammoth": "13%",
  "Grand Wyvern": "17%",
  "Grandiose Grrloc": "16%",
  "Grandmaster's Prophetic Board": "50%",
  "Grandmaster's Royal Board": "31%",
  "Gravestone Battle Gargon": "57%",
  "Gray Elekk": "58%",
  "Gray Kodo": "57%",
  "Gray Ram": "62%",
  "Great Black Dragon Turtle": "45%",
  "Great Blue Dragon Turtle": "44%",
  "Great Blue Elekk": "55%",
  "Great Brewfest Kodo": "36%",
  "Great Brown Dragon Turtle": "43%",
  "Great Brown Kodo": "51%",
  "Great Exarch's Elekk": "33%",
  "Great Golden Kodo": "12%",
  "Great Gray Kodo": "51%",
  "Great Green Dragon Turtle": "44%",
  "Great Green Elekk": "54%",
  "Great Greytusk": "22%",
  "Great Northern Elderhorn": "7%",
  "Great Purple Dragon Turtle": "44%",
  "Great Purple Elekk": "54%",
  "Great Red Dragon Turtle": "45%",
  "Great Red Elekk": "20%",
  "Great Sea Ray": "13%",
  "Great Sunwalker Kodo": "23%",
  "Great White Kodo": "53%",
  "Green Dragon Turtle": "48%",
  "Green Kodo": "<1%",
  "Green Marsh Hopper": "3%",
  "Green Mechanostrider": "57%",
  "Green Primal Raptor": "32%",
  "Green Proto-Drake": "19%",
  "Green Qiraji Battle Tank": "62%",
  "Green Riding Nether Ray": "23%",
  "Green Shado-Pan Riding Tiger": "29%",
  "Green Skeletal Warhorse": "60%",
  "Green Wind Rider": "49%",
  "Grey Riding Camel": "5%",
  "Grey Riding Yak": "41%",
  "Grievous Gladiator's Cloud Serpent": "<1%",
  Grimhowl: "11%",
  "Grinning Reaver": "10%",
  "Grizzly Hills Packmaster": "9%",
  "Grotto Netherwing Drake": "50%",
  "Grove Defiler": "8%",
  "Grove Warden": "24%",
  "Gruesome Flayedwing": "8%",
  "Guardian Quilen": "21%",
  "Guardian Vorquin": "34%",
  "Hailstorm Armoredon": "32%",
  "Hand of Bahmethra": "11%",
  "Hand of Hrestimorak": "7%",
  "Hand of Nilganihmaht": "9%",
  "Hand of Reshkigaal": "52%",
  "Hand of Salaranga": "4%",
  "Harbor Gryphon": "50%",
  "Harvester's Dredwing": "13%",
  "Hateforged Blazecycle": "35%",
  "Headless Horseman's Mount": "37%",
  "Heart of the Aspects": "19%",
  "Heartbond Lupine": "7%",
  "Hearthkeeper's Wandering Caravan": "2%",
  Hearthsteed: "64%",
  "Heartlight Vombata": "16%",
  "Heartseeker Mana Ray": "13%",
  "Heavenly Azure Cloud Serpent": "38%",
  "Heavenly Crimson Cloud Serpent": "9%",
  "Heavenly Golden Cloud Serpent": "16%",
  "Heavenly Onyx Cloud Serpent": "36%",
  "Hellfire Infernal": "32%",
  "Herald of Sa'bak": "26%",
  "Heritage Undercrawler": "29%",
  "Hexed Vilefeather Eagle": "<1%",
  "Hexflame Reaver": "3%",
  "High Priest's Felscorned Seeker": "28%",
  "High Priest's Lightsworn Seeker": "15%",
  "High Shaman's Aerie Gryphon": "44%",
  "High-Yield Shreddertank": "<1%",
  "Highland Drake": "99%",
  "Highland Elderhorn": "31%",
  "Highland Mustang": "15%",
  "Highlands Gobbler": "24%",
  "Highlord's Golden Charger": "22%",
  "Highlord's Valorous Charger": "16%",
  "Highlord's Vengeful Charger": "16%",
  "Highlord's Vigilant Charger": "16%",
  "Highmountain Elderhorn": "29%",
  "Highmountain Thunderhoof": "42%",
  "Highwind Darkmane": "18%",
  "Hogrus, Swine of Good Fortune": "8%",
  "Honeyback Harvester": "10%",
  "Honeyback Hivemother": "3%",
  Hooktalon: "12%",
  "Hopecrusher Gargon": "3%",
  "Horrid Dredwing": "13%",
  "Hot Motocross Bunmover 4400": "5%",
  "Hot Motocross Bunmover 4600": "2%",
  "Hulking Deathroc": "5%",
  "Huntmaster's Dire Wolfhawk": "13%",
  "Huntmaster's Fierce Wolfhawk": "13%",
  "Huntmaster's Loyal Wolfhawk": "20%",
  "Ice Mammoth": "17%",
  "Icebound Frostbrood Vanquisher": "44%",
  "Icy Blue Mechanostrider Mod A": "<1%",
  "Igneous Shalewing": "8%",
  "Illidari Blightstalker": "30%",
  "Illidari Doomhawk": "47%",
  "Illidari Dreadstalker": "31%",
  "Illidari Felstalker": "25%",
  Imagiwing: "23%",
  "Imperial Quilen": "18%",
  "Inarius' Charger": "22%",
  "Incognitro, the Indecipherable Felcycle": "10%",
  "Indigo Coiled Horror": "4%",
  "Ineffable Skitterer": "4%",
  "Infernal Direwolf": "10%",
  "Inferno Armoredon": "30%",
  "Infested Necroray": "11%",
  "Infinite Armoredon": "26%",
  "Infinite Timereaver": "37%",
  "Inkscale Deepseeker": "4%",
  "Innovation Investigator": "<1%",
  "Inquisition Gargon": "2%",
  "Insatiable Shredclaw": "25%",
  Invincible: "25%",
  "Iron Skyreaver": "11%",
  "Ironbound Proto-Drake": "46%",
  "Ironbound Wraithcharger": "31%",
  "Ironclad Frostclaw": "23%",
  "Ironforge Ram": "7%",
  "Ironhoof Destroyer": "11%",
  "Ironside Warwolf": "8%",
  "Iskaara Trader's Ottuk": "6%",
  "Island Thunderscale": "8%",
  "Ivory Cloud Serpent": "14%",
  "Ivory Goliathus": "13%",
  "Ivory Grimlynx": "61%",
  "Ivory Hawkstrider": "1%",
  "Ivory Raptor": "<1%",
  "Ivory Savagemane": "9%",
  "Ivory Trader's Ottuk": "12%",
  "Jade Cloud Serpent": "43%",
  "Jade Pandaren Kite": "67%",
  "Jade Panther": "20%",
  "Jade Primordial Direhorn": "24%",
  "Jade Pterrordax": "22%",
  "Jade, Bright Foreseer": "27%",
  "Jani's Trashpile": "2%",
  "Jeweled Copper Scarab": "33%",
  "Jeweled Onyx Panther": "16%",
  "Jeweled Sapphire Scarab": "32%",
  "Jigglesworth Sr.": "29%",
  "Jungle Riding Crane": "24%",
  "Junkheap Drifter": "6%",
  "Junkmaestro's Magnetomech": "10%",
  "K'arroc Swiftwing": "32%",
  "Kafa Yak": "24%",
  "Kah, Legend of the Deep": "6%",
  "Kaldorei Nightsaber": "17%",
  "Kaldorei War Wolf": "33%",
  "Kalu'ak Crest-Horn": "25%",
  "Keg Leg's Radiant Crocolisk": "35%",
  "Kickin' Kezan Waveshredder": "2%",
  "Kor'kron Annihilator": "45%",
  "Kor'kron Juggernaut": "26%",
  "Kor'kron War Wolf": "14%",
  "Kor'kron Warsaber": "40%",
  "Kua'fon": "5%",
  "Kul Tiran Charger": "36%",
  "Lab-Grown Stormray": "17%",
  "Lambent Mana Ray": "26%",
  "Lana'thel's Crimson Cascade": "3%",
  "Lavender K'arroc": "23%",
  "Leaping Veinseeker": "17%",
  "Legion-Forged Elekk": "47%",
  "Leyfeather Hippogryph": "11%",
  "Leystone Basilisk": "29%",
  "Leywoven Flying Carpet": "33%",
  "Liberated Slyvern": "1%",
  "Life-Binder's Handmaiden": "17%",
  "Light-Forged Mechsuit": "26%",
  "Lightforged Felcrusher": "43%",
  "Lightforged Ruinstrider": "23%",
  "Lightforged Warframe": "8%",
  "Lightwing Dragonhawk": "48%",
  "Lil' Donkey": "18%",
  "Liquid Hot Magma Slug": "4%",
  "Little Red Riding Goat": "25%",
  "Lively Darkmoon Charger": "16%",
  "Living Heartsbane Cauldron": "<1%",
  "Lizi, Thunderspine Tramper": "19%",
  "Llothien Prowler": "40%",
  "Loa-Blessed Wayfarer": "11%",
  "Long-Forgotten Hippogryph": "34%",
  "Longhorned Argussian Talbuk": "22%",
  "Longhorned Beryl Talbuk": "22%",
  "Longhorned Bleakhoof Talbuk": "23%",
  "Longhorned Sable Talbuk": "22%",
  "Lord of the Corpseflies": "9%",
  "Love Witch's Sweeper": "21%",
  "Loyal Gorger": "7%",
  "Loyal Magmammoth": "17%",
  "Lucent Hawkstrider": "23%",
  "Lucid Nightmare": "20%",
  "Lucky Yun": "24%",
  "Luminous Mana Ray": "23%",
  "Luminous Sporeglider": "11%",
  "Luminous Starseeker": "12%",
  "Lunar Dreamstag": "31%",
  "Lunar Launcher": "11%",
  "Lurid Bloodtusk": "15%",
  "Luxurious Riding Crane": "24%",
  "Machine Defense Unit 1-11": "30%",
  "Maddened Chaosrunner": "29%",
  "Maelie, the Wanderer": "13%",
  "Mag'har Direwolf": "42%",
  "Magenta Cloud Serpent": "33%",
  "Magic Rooster": "<1%",
  "Magister's Spell Bee": "4%",
  Magmashell: "23%",
  "Magnificent Flying Carpet": "24%",
  "Mail Muncher": "24%",
  "Majestic Armored Vorquin": "33%",
  "Majestic Azure Peafowl": "32%",
  "Maldraxxian Corpsefly": "52%",
  "Malevolent Drone": "6%",
  "Malevolent Gladiator's Cloud Serpent": "<1%",
  Mammyth: "22%",
  "Marble Quilen": "23%",
  "Margin Manipulator": "<1%",
  Marrowfang: "16%",
  "Mastercraft Gravewing": "6%",
  "Mawdapted Raptora": "3%",
  "Mawsworn Charger": "20%",
  "Mawsworn Soulhunter": "3%",
  "Mean Green Flying Machine": "5%",
  "Meat Wagon": "13%",
  "Mecha-Mogul Mk2": "12%",
  "Mechacycle Model W": "5%",
  "Mechagon Mechanostrider": "32%",
  "Mechagon Peacekeeper": "7%",
  "Mechanical Prototype Panther MK-0": "0%",
  "Mechanized Lumber Extractor": "26%",
  "Mechano-Hog": "25%",
  "Meeksi Brewthief": "2%",
  "Meeksi Rollingpaw": "2%",
  "Meeksi Rufflefur": "2%",
  "Meeksi Softpaw": "2%",
  "Meeksi Teatuft": "2%",
  "Mekgineer's Chopper": "26%",
  "Merciless Nether Drake": "<1%",
  Midnight: "34%",
  "Mighty Caravan Brutosaur": "4%",
  "Mimiron's Head": "16%",
  "Mimiron's Jumpjets": "10%",
  "Minion of Grumpus": "14%",
  "Modest Expedition Yak": "23%",
  "Mogu Hazeblazer": "26%",
  Mollie: "7%",
  "Molten Cormaera": "37%",
  "Moonlit Nightsaber": "11%",
  "Moonlit Witchwick's Rider": "<1%",
  "Morning Flourish Dreamsaber": "32%",
  "Morsel Sniffer": "19%",
  "Mosshide Riverwallow": "8%",
  "Mossy Mammoth": "12%",
  "Mossy Witchwick's Rider": "0%",
  "Mottled Drake": "<1%",
  "Mottled Meadowstomper": "26%",
  "Mottled Red Raptor": "<1%",
  "Mountain Horse": "55%",
  "Mudback Riverbeast": "36%",
  "Mystic Runesaber": "14%",
  "Nazjatar Blood Serpent": "6%",
  "Nesting Swarmite": "7%",
  "Nether-Gorged Greatwyrm": "26%",
  "Nether-Swept Drake": "3%",
  "Netherforged Nullframe": "4%",
  "Netherlord's Accursed Wrathsteed": "11%",
  "Netherlord's Brimstone Wrathsteed": "13%",
  "Netherlord's Chaotic Wrathsteed": "17%",
  "Night Pterrorwing": "24%",
  "Nightborne Manasaber": "42%",
  "Nightfall Skyreaver": "13%",
  "Noble Bruffalon": "10%",
  "Noble Flying Carpet": "8%",
  "Notorious Gladiator's Proto-Drake": "<1%",
  "Ny'alotha Allseer": "6%",
  "Ny'alothan Shadow Worm": "5%",
  "Obsidian Gladiator's Slitherdrake": "<1%",
  "Obsidian Gravewing": "16%",
  "Obsidian Krolusk": "4%",
  "Obsidian Nightwing": "14%",
  "Obsidian Vorquin": "52%",
  "Obsidian Worldbreaker": "55%",
  "OC91 Chariot": "23%",
  "Ochre Delivery Rocket": "4%",
  "Ochre Dreamtalon": "8%",
  "Ochre Skeletal Warhorse": "61%",
  "Ol' Mole Rufus": "3%",
  "Onyx Cloud Serpent": "32%",
  "Onyx Netherwing Drake": "30%",
  "Onyxian Drake": "27%",
  "Orgrimmar Interceptor": "6%",
  "Orgrimmar Wolf": "8%",
  "Ornery Breezestrider": "22%",
  "Otterworldly Ottuk Carrier": "18%",
  Otto: "7%",
  "Pale Acidmaw": "7%",
  "Pale Gravewing": "5%",
  "Pale Regal Cervid": "6%",
  "Pale Riding Crane": "24%",
  "Pale Thorngrazer": "5%",
  "Palehide Direhorn": "1%",
  "Palehide Mushan Beast": "24%",
  Palomino: "<1%",
  "Pandaren Kite": "11%",
  "Patient Bufonid": "21%",
  Pattie: "11%",
  "Pearlescent Butterfly": "36%",
  "Pearlescent Goblin Wave Shredder": "39%",
  "Pearlescent Krolusk": "5%",
  "Perfected Juggernaut": "19%",
  "Peridot Dragonhawk": "31%",
  "Personalized Goblin S.C.R.A.P.per": "8%",
  "Pestilent Necroray": "11%",
  "Phalynx of Courage": "54%",
  "Phalynx of Humility": "9%",
  "Phalynx of Loyalty": "7%",
  "Phalynx of Purity": "15%",
  "Phase-Lost Slateback": "5%",
  "Phosphorescent Stone Drake": "10%",
  Pinto: "65%",
  "Plagued Proto-Drake": "<1%",
  "Plaguerot Tauralus": "14%",
  "Plainswalker Bearer": "30%",
  "Plunderlord's Golden Crocolisk": "66%",
  "Plunderlord's Midnight Crocolisk": "10%",
  "Polly Roger": "17%",
  "Pond Nettle": "2%",
  "Predatory Bloodgazer": "6%",
  "Predatory Plagueroc": "10%",
  "Prestigious Azure Courser": "16%",
  "Prestigious Bloodforged Courser": "1%",
  "Prestigious Bronze Courser": "50%",
  "Prestigious Forest Courser": "9%",
  "Prestigious Ivory Courser": "27%",
  "Prestigious Midnight Courser": "4%",
  "Prestigious Royal Courser": "7%",
  "Prestigious War Steed": "6%",
  "Prestigious War Wolf": "5%",
  "Preyhunter's Fury": "4%",
  "Preyseeker's Hubris": "17%",
  "Preyseeker's Nightmare": "5%",
  "Preyseeker's Wrath": "11%",
  "Prideful Gladiator's Cloud Serpent": "<1%",
  "Priestess' Moonsaber": "8%",
  "Primal Flamesaber": "18%",
  "Primal Gladiator's Felblood Gronnling": "<1%",
  "Primeval Skyfriend": "<1%",
  "Prismatic Snapdragon": "14%",
  "Prized Gladiator's Fel Bat": "<1%",
  "Prized Turkey": "35%",
  "Profit-Green Shreddertank": "<1%",
  "Prophet's Great Raven": "4%",
  "Prototype A.S.M.R.": "6%",
  "Prototype Leaper": "4%",
  "Proudmoore Sea Scout": "5%",
  "Prowling Shredclaw": "2%",
  "Pureblood Fire Hawk": "28%",
  "Pureheart Courser": "11%",
  "Purple Dragon Turtle": "49%",
  "Purple Elekk": "64%",
  "Purple Hawkstrider": "57%",
  "Purple Netherwing Drake": "27%",
  "Purple Riding Nether Ray": "24%",
  "Purple Shado-Pan Riding Tiger": "27%",
  "Purple Skeletal Warhorse": "61%",
  "Pyrewood Rebel's Rouncey": "17%",
  "Qinsho's Eternal Hound": "8%",
  Quawks: "39%",
  "Quel'dorei Steed": "6%",
  "Rabbit'ath": "6%",
  "Radiant Imperial Lynx": "13%",
  "Raging Cinderbee": "2%",
  "Raging Magmammoth": "8%",
  "Rajani Warserpent": "5%",
  "Rampaging Mauler": "19%",
  "Rampart Screecher": "10%",
  "Raptora Swooper": "7%",
  Ratstallion: "8%",
  "Raven Lord": "30%",
  "Ravenous Black Gryphon": "29%",
  "Ravenous Shredclaw": "8%",
  "Red Dragon Turtle": "52%",
  "Red Dragonhawk": "49%",
  "Red Drake": "32%",
  "Red Flying Cloud": "36%",
  "Red Hawkstrider": "64%",
  "Red Mechanostrider": "55%",
  "Red Primal Raptor": "32%",
  "Red Proto-Drake": "31%",
  "Red Qiraji Battle Tank": "41%",
  "Red Riding Nether Ray": "24%",
  "Red Shado-Pan Riding Tiger": "29%",
  "Red Skeletal Horse": "64%",
  "Red Skeletal Warhorse": "50%",
  "Red Wolf": "<1%",
  "Regal Corpsefly": "13%",
  "Regal Riding Crane": "28%",
  "Rekindled Dreamstag": "32%",
  "Relentless Gladiator's Frost Wyrm": "<1%",
  "Relinquished Scarlet Charger": "64%",
  "Remembered Golden Gryphon": "16%",
  "Remembered Wind Rider": "15%",
  "Ren's Stalwart Hound": "4%",
  "Renewed Magmammoth": "12%",
  "Renewed Proto-Drake": "99%",
  "Resplendent K'arroc": "9%",
  "Restoration Deathwalker": "20%",
  "Retrained Skyrazor": "26%",
  "Riddler's Mind-Worm": "23%",
  "Riding Turtle": "23%",
  "Risen Mare": "5%",
  "Rivendare's Deathcharger": "25%",
  "Riverwalker Mushan": "25%",
  "Rocket Shredder 9001": "5%",
  "Rocktusk Battleboar": "26%",
  "Rootstalker Grimlynx": "3%",
  "Rose Riding Crane": "24%",
  "Royal Court Undercrawler": "28%",
  "Royal Seafeather": "17%",
  "Royal Snapdragon": "9%",
  "Royal Swarmer": "30%",
  "Royal Voidwing": "29%",
  "Ruby Butterfly": "32%",
  "Ruby Panther": "22%",
  "Ruby Void Creeper": "15%",
  "Ruby Writhe": "2%",
  "Rubyshell Krolusk": "13%",
  "Ruddy Sporeglider": "11%",
  "Runebound Firelord": "10%",
  "Russet Bufonid": "3%",
  "Russet Ruinstrider": "23%",
  "Rustbolt Resistor": "3%",
  "Rusted Proto-Drake": "46%",
  "Rusty Mechanocrawler": "4%",
  "Ruthless Gladiator's Twilight Drake": "<1%",
  "Sable Ruinstrider": "24%",
  Salatrancer: "29%",
  "Saltwater Seahorse": "8%",
  "Salvaged Goblin Gazillionaire's Flying Machine": "14%",
  "Sanctum Gloomcharger": "12%",
  "Sandstone Drake": "48%",
  "Sandy Nightsaber": "12%",
  "Sandy Shalewing": "23%",
  "Sanguine Harrower": "3%",
  "Sapphire Panther": "22%",
  "Sapphire Riverbeast": "17%",
  "Sapphire Skyblazer": "23%",
  "Sapphire Vorquin": "48%",
  "Sarge's Tale": "29%",
  "Savage Alabaster Battle Turtle": "16%",
  "Savage Blue Battle Turtle": "23%",
  "Savage Crimson Battle Turtle": "22%",
  "Savage Ebony Battle Turtle": "<1%",
  "Savage Green Battle Turtle": "39%",
  "Savage Raptor": "<1%",
  "Scarlet Helicid": "5%",
  "Scarlet Pterrordax": "48%",
  "Scarlet Void Flyer": "22%",
  "Scarlet Witchwick's Rider": "0%",
  "Scintillating Mana Ray": "37%",
  "Scorching Valor": "25%",
  "Scourgebound Vanquisher": "24%",
  "Scrapforged Mechaspider": "33%",
  "Scrappy Worldsnail": "7%",
  "Sea Turtle": "15%",
  "Sea-Dwelling Isle Serpent": "<1%",
  "Seabraid Stallion": "19%",
  "Seething Slug": "7%",
  "Sentinel War Wolf": "41%",
  Serenade: "5%",
  "Sha-Warped Cloud Serpent": "8%",
  "Sha-Warped Riding Tiger": "8%",
  "Shackled Shadow": "27%",
  "Shackled Ur'zul": "28%",
  "Shadeleaf Runestag": "16%",
  "Shadow Dusk Dreamsaber": "8%",
  "Shadow of Doubt": "8%",
  "Shadowbarb Drone": "11%",
  "Shadowblade's Baneful Omen": "10%",
  "Shadowblade's Crimson Omen": "10%",
  "Shadowblade's Felscorned Omen": "28%",
  "Shadowblade's Lethal Omen": "10%",
  "Shadowblade's Murderous Omen": "15%",
  "Shadowed Swarmite": "8%",
  "Shadowflame Shalewing": "7%",
  "Shadowhide Pearltusk": "5%",
  "Shadowmane Charger": "15%",
  "Shale Ramolith": "29%",
  "Shaohao's Sage Serpent": "17%",
  Sharkbait: "18%",
  Shellack: "4%",
  "Shimmering Aurelid": "6%",
  "Shimmermist Free Runner": "35%",
  "Shimmermist Runner": "36%",
  "Shu-Zen, the Divine Sentinel": "10%",
  Siesbarg: "8%",
  "Silent Glider": "2%",
  "Silky Shimmermoth": "8%",
  "Siltwing Albatross": "10%",
  "Silver Covenant Hippogryph": "8%",
  "Silver Riding Crane": "24%",
  "Silver Riding Nether Ray": "24%",
  "Silver Riding Talbuk": "26%",
  "Silver Tidestallion": "23%",
  "Silver War Talbuk": "26%",
  "Silvermoon Hawkstrider": "7%",
  "Silvermoon Sweeper": "45%",
  "Silvermoon's Arcane Defender": "27%",
  "Silvertip Dredwing": "8%",
  "Silverwind Larion": "12%",
  "Sinfall Gargon": "16%",
  "Sinfall Gravewing": "55%",
  "Sinful Gladiator's Soul Eater": "<1%",
  "Sinister Gladiator's Proto-Drake": "<1%",
  "Sinrunner Blanchy": "19%",
  "Sintouched Deathwalker": "21%",
  Skullripper: "18%",
  "Sky Golem": "53%",
  "Sky Surfer": "28%",
  "Sky Witch's Sweeper": "3%",
  "Skyskin Hornstrider": "6%",
  "Slag Basilisk": "28%",
  "Slate Primordial Direhorn": "26%",
  "Slatestone Ramolith": "53%",
  "Slayer's Felbroken Shrieker": "20%",
  "Slayer's Felscorned Shrieker": "31%",
  "Slime Serpent": "22%",
  "Smoky Charger": "10%",
  "Smoky Direwolf": "5%",
  "Smoldering Cinderbee": "29%",
  "Smoldering Ember Wyrm": "35%",
  "Snapback Scuttler": "6%",
  "Snapdragon Kelpstalker": "16%",
  "Snowfeather Hunter": "7%",
  "Snowfluff Dreamtalon": "33%",
  "Snowpaw Glimmerfur Prowler": "4%",
  Snowstorm: "9%",
  "Snowy Gryphon": "50%",
  "Snowy Highmountain Eagle": "32%",
  "Snowy Riding Goat": "25%",
  "Soaring Meaderbee": "17%",
  "Soaring Razorwing": "14%",
  "Soaring Sky Fox": "23%",
  "Soaring Skyterror": "37%",
  "Soaring Spelltome": "4%",
  "Solar Spirehawk": "3%",
  "Son of Galleon": "19%",
  "Soulbound Gloomcharger": "9%",
  "Soultwisted Deathwalker": "20%",
  "Soweezi's Vintage Waveshredder": "11%",
  "Spawn of Galakras": "11%",
  "Spawn of Horridon": "26%",
  "Spawn of Vyranoth": "19%",
  "Spectral Gryphon": "21%",
  "Spectral Hawkstrider": "24%",
  "Spectral Pterrorwing": "6%",
  "Spectral Steed": "10%",
  "Spectral Tiger": "1%",
  "Spectral Wind Rider": "20%",
  "Spectral Wolf": "9%",
  "Speculative Shreddertank": "<1%",
  "Spinemaw Gladechewer": "30%",
  "Spirit of Eche'ro": "44%",
  "Spirit of Tok'jara": "4%",
  "Sporebearer Fungal Strider": "<1%",
  "Spotted Black Riding Goat": "19%",
  "Spotted Frostsaber": "61%",
  "Spring Butterfly": "13%",
  "Spring Harvesthog": "39%",
  "Springfur Alpaca": "10%",
  "Springtide Dreamtalon": "33%",
  Squawks: "7%",
  "Squeakers, the Trickster": "19%",
  "Starcursed Voidstrider": "47%",
  Stargrazer: "31%",
  "Starspark Netherdrake": "8%",
  "Startouched Furline": "18%",
  "Steamscale Incinerator": "19%",
  "Steamwheedle Supplier": "2%",
  "Steel Prototype Panther MK-0": "0%",
  "Steelbound Devourer": "30%",
  "Sthaarbs's Last Lunch": "8%",
  "Stoneforged Sentinel": "1%",
  "Stonehide Elderhorn": "13%",
  "Stonevault Mechsuit": "3%",
  "Stormhide Salamanther": "43%",
  "Stormpike Battle Charger": "18%",
  "Stormpike Battle Ram": "12%",
  "Stormsong Coastwatcher": "4%",
  "Stormtouched Bruffalon": "6%",
  "Stormwind Skychaser": "7%",
  "Stormwind Steed": "8%",
  "Striped Dawnsaber": "64%",
  "Striped Frostsaber": "65%",
  "Striped Nightsaber": "67%",
  "Subdued Seahorse": "41%",
  "Subterranean Magmammoth": "17%",
  "Sulfur Hound": "19%",
  "Summer Wilderling": "12%",
  "Sun Festival's Painted Roc": "5%",
  Sundancer: "12%",
  "Sundered Zerethsteed": "5%",
  "Sunflare Driftmoth": "18%",
  "Sunhide Gronnling": "17%",
  "Sunreaver Dragonhawk": "8%",
  "Sunreaver Hawkstrider": "6%",
  "Sunstone Panther": "20%",
  "Suntouched Dreamstag": "30%",
  "Sunwalker Kodo": "23%",
  "Sunwarmed Furline": "14%",
  "Sureki Skyrazor": "6%",
  "Surf Jelly": "12%",
  "Swarmite Skyhunter": "37%",
  "Swift Albino Raptor": "19%",
  "Swift Alliance Steed": "<1%",
  "Swift Armored Vorquin": "33%",
  "Swift Blue Gryphon": "44%",
  "Swift Blue Raptor": "53%",
  "Swift Breezestrider": "27%",
  "Swift Brewfest Ram": "36%",
  "Swift Brown Ram": "54%",
  "Swift Brown Steed": "62%",
  "Swift Brown Wolf": "62%",
  "Swift Burgundy Wolf": "20%",
  "Swift Forest Strider": "15%",
  "Swift Frostsaber": "61%",
  "Swift Frostwolf": "10%",
  "Swift Gloomhoof": "14%",
  "Swift Gray Ram": "53%",
  "Swift Gray Steed": "20%",
  "Swift Gray Wolf": "65%",
  "Swift Green Gryphon": "43%",
  "Swift Green Hawkstrider": "55%",
  "Swift Green Mechanostrider": "51%",
  "Swift Green Wind Rider": "43%",
  "Swift Horde Wolf": "<1%",
  "Swift Lovebird": "25%",
  "Swift Mistsaber": "61%",
  "Swift Moonsaber": "21%",
  "Swift Mountain Horse": "49%",
  "Swift Nether Drake": "<1%",
  "Swift Olive Raptor": "53%",
  "Swift Orange Raptor": "54%",
  "Swift Palomino": "64%",
  "Swift Pink Hawkstrider": "54%",
  "Swift Purple Gryphon": "59%",
  "Swift Purple Hawkstrider": "54%",
  "Swift Purple Raptor": "18%",
  "Swift Purple Wind Rider": "60%",
  "Swift Razzashi Raptor": "2%",
  "Swift Red Gryphon": "46%",
  "Swift Red Hawkstrider": "20%",
  "Swift Red Wind Rider": "46%",
  "Swift Shorestrider": "19%",
  "Swift Spectral Tiger": "1%",
  "Swift Springstrider": "32%",
  "Swift Stormsaber": "60%",
  "Swift Timber Wolf": "64%",
  "Swift Violet Ram": "18%",
  "Swift Warstrider": "43%",
  "Swift White Hawkstrider": "50%",
  "Swift White Mechanostrider": "51%",
  "Swift White Ram": "53%",
  "Swift White Steed": "65%",
  "Swift Windsteed": "37%",
  "Swift Yellow Mechanostrider": "53%",
  "Swift Yellow Wind Rider": "44%",
  "Swift Zhevra": "42%",
  "Swift Zulian Panther": "20%",
  "Swift Zulian Tiger": "2%",
  "Sylverian Dreamer": "17%",
  Taivan: "5%",
  Talont: "30%",
  "Tamed Mauler": "8%",
  "Tamed Skitterfly": "24%",
  "Tan Riding Camel": "36%",
  "Tan Riding Talbuk": "26%",
  "Tan War Talbuk": "26%",
  "Tangled Dreamweaver": "52%",
  "Tarachnid Creeper": "7%",
  "Tarecgosa's Visage": "5%",
  "Tawny Wind Rider": "51%",
  "Tazavesh Gearglider": "26%",
  "Teal Kodo": "<1%",
  "Teldrassil Hippogryph": "28%",
  "Telix the Stormhorn": "9%",
  "Temperamental Skyclaw": "21%",
  "Tenebrous Harrower": "5%",
  "Terrified Pack Mule": "5%",
  "Terror of the Night": "9%",
  "Terror of the Wastes": "12%",
  "Thalassian Charger": "55%",
  "Thalassian Warhorse": "55%",
  "The Big G": "6%",
  "The Bone Freezer": "21%",
  "The Breaker's Song": "12%",
  "The Dreadwake": "46%",
  "The Headless Horseman's Ghoulish Charger": "8%",
  "The Headless Horseman's Hallowed Charger": "44%",
  "The Hivemind": "11%",
  "The Topskimmer Special": "18%",
  "The Writhing Brood": "15%",
  "Thrayir, Eyes of the Siren": "10%",
  "Thunder Bluff Kodo": "7%",
  "Thunder-Ridged Elekk": "<1%",
  "Thunderdrum Misfire": "22%",
  "Thundering August Cloud Serpent": "20%",
  "Thundering Cobalt Cloud Serpent": "22%",
  "Thundering Jade Cloud Serpent": "42%",
  "Thundering Onyx Cloud Serpent": "29%",
  "Thundering Ruby Cloud Serpent": "38%",
  "Timber Wolf": "65%",
  "Timbered Sky Snake": "28%",
  "Time-Lost Proto-Drake": "9%",
  "Timely Buzzbee": "29%",
  "Tomb Stalker": "14%",
  "Topaz Skyfang": "2%",
  "Tortured Gorger": "3%",
  "Trader's Gilded Brutosaur": "26%",
  "Trained Icehoof": "25%",
  "Trained Meadowstomper": "25%",
  "Trained Riverwallow": "25%",
  "Trained Rocktusk": "25%",
  "Trained Silverpelt": "25%",
  "Trained Snarler": "25%",
  "Translocated Gorger": "4%",
  "Traveler's Tundra Mammoth": "48%",
  "Treetop Highmountain Eagle": "32%",
  "Tropical Riding Crane": "24%",
  "Tundra Icehoof": "14%",
  "Turbo-Charged Flying Machine": "20%",
  Turbostrider: "18%",
  "Turquoise Courser": "31%",
  "Turquoise Raptor": "57%",
  "Tuskarr Shoreglider": "7%",
  "Twilight Avenger": "8%",
  "Twilight Courser": "31%",
  "Twilight Drake": "66%",
  "Twilight Harbinger": "24%",
  "Twilight Sky Prowler": "38%",
  "Twilight Witch's Sweeper": "3%",
  "Tyrael's Charger": "46%",
  "Tyrannical Gladiator's Cloud Serpent": "<1%",
  Tyrannotort: "9%",
  "Ultramarine Qiraji Battle Tank": "6%",
  "Umber Nightsaber": "16%",
  "Umber Ruinstrider": "23%",
  "Umbral Ashes": "2%",
  "Umbral Dragonhawk": "8%",
  "Umbral K'arroc": "7%",
  "Umbral Scythehorn": "6%",
  "Unarmored Deathtusk Felboar": "21%",
  "Unbound Manawyrm": "5%",
  "Unbound Star-Eater": "5%",
  "Unchained Gladiator's Soul Eater": "<1%",
  "Uncorrupted Voidwing": "34%",
  "Undercity Plaguebat": "28%",
  "Underlight Corrupted Behemoth": "33%",
  "Underrot Crawg": "15%",
  "Undying Darkhound": "14%",
  "Unpainted Mechanostrider": "57%",
  "Unshackled Waveray": "12%",
  "Unsuccessful Prototype Fleetpod": "3%",
  "Untainted Grove Crawler": "18%",
  "Ur'zul Fleshripper": "16%",
  "Val'sharah Hippogryph": "18%",
  "Valarjar Stormwing": "33%",
  Valiance: "4%",
  "Vandal's Gearglider": "34%",
  "Vashj'ir Seahorse": "47%",
  Vengeance: "7%",
  "Vengeful Nether Drake": "<1%",
  "Venomhide Ravasaur": "14%",
  "Venomous Coiler": "2%",
  "Venomous Gladiator's Goredrake": "<1%",
  "Venture Co-ordinator": "2%",
  "Verdant Armoredon": "35%",
  "Verdant Gladiator's Slitherdrake": "<1%",
  "Verdant Skitterfly": "15%",
  "Veridian Netherwing Drake": "28%",
  "Vermillion Imperial Lynx": "28%",
  "Vespoid Flutterer": "4%",
  "Veteran Adventurer's Loyal Companion": "13%",
  "Vibrant Flutterwing": "7%",
  "Vibrant Mana Ray": "38%",
  "Vibrant Petalwing": "3%",
  "Vicious Black Bonesteed": "4%",
  "Vicious Black Warsaber": "5%",
  "Vicious Dreamtalon": "2%",
  "Vicious Electro Eel": "2%",
  "Vicious Gilnean Warhorse": "4%",
  "Vicious Gladiator's Twilight Drake": "<1%",
  "Vicious Kaldorei Warsaber": "7%",
  "Vicious Lightbloom Boar": "<1%",
  "Vicious Moonbeast": "3%",
  "Vicious Sabertooth": "4%",
  "Vicious Skeletal Warhorse": "7%",
  "Vicious Skyflayer": "3%",
  "Vicious Snaplizard": "2%",
  "Vicious Snapvine": "28%",
  "Vicious Void Creeper": "2%",
  "Vicious War Basilisk": "4%",
  "Vicious War Bear": "4%",
  "Vicious War Clefthoof": "5%",
  "Vicious War Croaker": "4%",
  "Vicious War Elekk": "4%",
  "Vicious War Fox": "5%",
  "Vicious War Gorm": "6%",
  "Vicious War Kodo": "4%",
  "Vicious War Lion": "4%",
  "Vicious War Mechanostrider": "4%",
  "Vicious War Ram": "5%",
  "Vicious War Raptor": "5%",
  "Vicious War Riverbeast": "6%",
  "Vicious War Scorpion": "4%",
  "Vicious War Snail": "3%",
  "Vicious War Spider": "8%",
  "Vicious War Steed": "6%",
  "Vicious War Trike": "4%",
  "Vicious War Turtle": "4%",
  "Vicious War Wolf": "6%",
  "Vicious Warstalker": "3%",
  "Vicious Warstrider": "4%",
  "Vicious White Bonesteed": "7%",
  "Vicious White Warsaber": "7%",
  "Vile Fiend": "29%",
  "Vindictive Gladiator's Storm Dragon": "<1%",
  "Violet Armored Growler": "20%",
  "Violet Darkmoon Charger": "26%",
  "Violet Goblin Shredder": "11%",
  "Violet Netherwing Drake": "28%",
  "Violet Pandaren Phoenix": "7%",
  "Violet Proto-Drake": "18%",
  "Violet Raptor": "56%",
  "Violet Spellwing": "41%",
  "Violet-Backed Skyfang": "3%",
  "Viridian Phase-Hunter": "14%",
  "Viridian Sharptalon": "6%",
  "Vitreous Stone Drake": "25%",
  "Vivacious Chloroceros": "10%",
  "Vivid Chloroceros": "11%",
  "Void-Corrupted Hex Eagle": "10%",
  "Void-Corrupted Lynx": "2%",
  "Void-Crystal Panther": "7%",
  "Void-Forged Stallion": "14%",
  "Void-Razed Elekk": "1%",
  "Void-Scarred Gryphon": "10%",
  "Void-Scarred Lynx": "10%",
  "Void-Scarred Pack Mother": "12%",
  "Void-Scarred Windrider": "11%",
  "Void-Touched Hawkstrider": "6%",
  "Void-Touched Snapdragon": "3%",
  "Voidbound Stormray": "7%",
  "Voidfire Deathcycle": "13%",
  "Voidlight Surger": "47%",
  "Voidmancer's Starcarver": "4%",
  "Voidtalon of the Dark Star": "5%",
  "Voidwing Dragonhawk": "47%",
  "Volcanic Stone Drake": "20%",
  "Voldunai Dunescraper": "4%",
  "Voracious Gorger": "4%",
  "Voyaging Wilderling": "22%",
  "Vulpine Familiar": "13%",
  "Wailing Banshee's Charger": "38%",
  "Wakener's Runestag": "7%",
  "Wandering Ancient": "82%",
  "War-Bred Tauralus": "52%",
  "Warforged Nightmare": "35%",
  Warhorse: "56%",
  "Warlord's Deathwheel": "49%",
  "Warmongering Gladiator's Felblood Gronnling": "<1%",
  "Warsong Direfang": "14%",
  "Warstitched Darkhound": "17%",
  "Waste Marauder": "4%",
  "Wastewander Skyterror": "12%",
  "Wastewarped Deathwalker": "23%",
  "Wen Lo, the River's Edge": "23%",
  "White Kodo": "55%",
  "White Mechanostrider Mod B": "<1%",
  "White Polar Bear": "14%",
  "White Ram": "57%",
  "White Riding Camel": "22%",
  "White Riding Goat": "22%",
  "White Riding Talbuk": "26%",
  "White Skeletal Warhorse": "21%",
  "White Stallion": "<1%",
  "White War Talbuk": "26%",
  "White War Wolf": "27%",
  "Whoofle Bramblewing": "<1%",
  Wick: "24%",
  "Wicked Swarmer": "9%",
  "Widow's Undercrawler": "32%",
  "Wild Dreamrunner": "30%",
  "Wild Gladiator's Felblood Gronnling": "<1%",
  "Wild Glimmerfur Prowler": "15%",
  "Wild Goretusk": "18%",
  "Wild Hunt Legsplitter": "13%",
  "Wildseed Cradle": "32%",
  "Windborne Velocidrake": "97%",
  "Winding Slitherdrake": "91%",
  "Winged Guardian": "17%",
  "Winged Steed of the Ebon Blade": "53%",
  "Winter Night Dreamsaber": "40%",
  "Winter Wilderling": "5%",
  "Winterborn Runestag": "6%",
  "Winterspring Frostsaber": "16%",
  "Wintry Witchwick's Rider": "<1%",
  "Witherbark Direwing": "18%",
  "Witherbark Pango": "2%",
  "Witherbark Warbear Mother": "7%",
  "Witherhide Cliffstomper": "24%",
  "Wonderwing 2.0": "52%",
  "Wondrous Wavewhisker": "27%",
  "Wooly Mammoth": "31%",
  "Wooly White Rhino": "1%",
  "Wrathful Gladiator's Frost Wyrm": "<1%",
  "Wretched Fel Bat": "31%",
  "Wriggling Parasite": "6%",
  "X-45 Heartbreaker": "10%",
  "X-51 Nether-Rocket": "<1%",
  "X-51 Nether-Rocket X-TREME": "1%",
  "X-53 Touring Rocket": "52%",
  "X-995 Mechanocat": "41%",
  Xinlao: "5%",
  "Xiwyllag ATV": "34%",
  "Xy Trustee's Gearglider": "2%",
  "Yellow Marsh Hopper": "2%",
  "Yellow Qiraji Battle Tank": "63%",
  "Yellow Scouting Ottuk": "23%",
  "Yellow War Ottuk": "18%",
  "Yu'lei, Daughter of Jade": "28%",
  "Zandalari Direhorn": "43%",
  "Zenet Hatchling": "15%",
  "Zereth Overseer": "5%",
  "Zothwing Darkseeker": "<1%",
  "Zothwing Deepseeker": "<1%",
  "Zovaal's Soul Eater": "3%",
};

function normalizeMountEnKey(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/['’`"]/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, " ")
    .trim();
}

const DFA_NORMALIZED_MAP = {};
Object.entries(DFA_RAW_COMPLETE_JSON).forEach(([name, pctStr]) => {
  const cleanStr = String(pctStr).trim();
  const numVal =
    cleanStr === "<1%" ? 0.5 : parseFloat(cleanStr.replace("%", ""));
  if (!Number.isNaN(numVal)) {
    DFA_NORMALIZED_MAP[normalizeMountEnKey(name)] = {
      pct: numVal,
      display: cleanStr.endsWith("%") ? cleanStr : `${cleanStr}%`,
    };
  }
});

// Strict whitelist of actual capital racial vendor mounts (prevents false vendor assignment)
const STRICT_RACIAL_VENDOR_WHITELIST = new Set(
  [
    // Blood Elf (Winaestra - Eversong Woods)
    "Red Hawkstrider",
    "Blue Hawkstrider",
    "Purple Hawkstrider",
    "Black Hawkstrider",
    "Swift Green Hawkstrider",
    "Swift Pink Hawkstrider",
    "Swift Purple Hawkstrider",
    // Orc (Ogunaro Wolfrunner - Orgrimmar)
    "Brown Wolf",
    "Dire Wolf",
    "Timber Wolf",
    "Black Wolf",
    "Swift Brown Wolf",
    "Swift Gray Wolf",
    "Swift Timber Wolf",
    // Troll (Zjolnir - Durotar)
    "Emerald Raptor",
    "Turquoise Raptor",
    "Violet Raptor",
    "Swift Blue Raptor",
    "Swift Olive Raptor",
    "Swift Orange Raptor",
    // Tauren (Harb Clawhoof - Mulgore)
    "Brown Kodo",
    "Gray Kodo",
    "White Kodo",
    "Great Brown Kodo",
    "Great Gray Kodo",
    "Great White Kodo",
    // Undead (Zachariah Post - Tirisfal Glades)
    "Red Skeletal Horse",
    "Blue Skeletal Horse",
    "Brown Skeletal Horse",
    "Black Skeletal Horse",
    "Green Skeletal Warhorse",
    "Purple Skeletal Warhorse",
    "Ochre Skeletal Warhorse",
    // Goblin (Kall Worthaton - Orgrimmar)
    "Goblin Trike",
    "Goblin Turbo-Trike",
    // Pandaren (Old Whitenose - Orgrimmar / Stormwind)
    "Green Dragon Turtle",
    "Black Dragon Turtle",
    "Blue Dragon Turtle",
    "Brown Dragon Turtle",
    "Purple Dragon Turtle",
    "Red Dragon Turtle",
    "Great Green Dragon Turtle",
    "Great Black Dragon Turtle",
    "Great Blue Dragon Turtle",
    "Great Brown Dragon Turtle",
    "Great Purple Dragon Turtle",
    "Great Red Dragon Turtle",
    // Horde Flight Master Vendor (Drakma - Orgrimmar)
    "Tawny Wind Rider",
    "Blue Wind Rider",
    "Green Wind Rider",
    "Swift Red Wind Rider",
    "Swift Green Wind Rider",
    "Swift Yellow Wind Rider",
    "Swift Purple Wind Rider",
    // Alliance Capital Vendors
    "Brown Horse",
    "Chestnut Mare",
    "Black Stallion",
    "Pinto",
    "Mountain Horse",
    "Swift Mountain Horse",
    "Swift Brown Steed",
    "Swift Palomino",
    "Swift White Steed",
    "Brown Ram",
    "Gray Ram",
    "White Ram",
    "Swift Brown Ram",
    "Swift Gray Ram",
    "Swift White Ram",
    "Striped Frostsaber",
    "Striped Nightsaber",
    "Striped Dawnsaber",
    "Spotted Frostsaber",
    "Swift Frostsaber",
    "Swift Mistsaber",
    "Swift Stormsaber",
    "Red Mechanostrider",
    "Blue Mechanostrider",
    "Green Mechanostrider",
    "Unpainted Mechanostrider",
    "Swift Green Mechanostrider",
    "Swift White Mechanostrider",
    "Swift Yellow Mechanostrider",
    "Brown Elekk",
    "Gray Elekk",
    "Purple Elekk",
    "Great Blue Elekk",
    "Great Green Elekk",
    "Great Purple Elekk",
    "Golden Gryphon",
    "Ebon Gryphon",
    "Snowy Gryphon",
    "Swift Blue Gryphon",
    "Swift Green Gryphon",
    "Swift Red Gryphon",
    "Swift Purple Gryphon",
  ].map((s) => normalizeMountEnKey(s))
);

// Проверенная энциклопедия точных инструкций и требований по данным ru.wowhead.com
const WOWHEAD_EXACT_MOUNT_GUIDES = {
  [normalizeMountEnKey("Spectral Wolf")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 240,
    faction: "Horde",
    zone: "Тол Барад (Батальон Адского Крика)",
    requirementsRu:
      "Орда • Превознесение с Батальоном Адского Крика • 165 Почетных знаков Тол Барада",
    summary:
      "Покупается у квартирмейстера Погга на полуострове Тол Барад за 165 рекомендательных значков Тол Барада при Превознесении.",
    steps: [
      "Отправляйся на полуостров Тол Барад через портал на Аллее Мудрости в Оргриммаре.",
      "Выполняй ежедневные задания в лагере Батальона Адского Крика и побеждай в битве за Тол Барад для сбора 165 Рекомендательных значков.",
      "Достигни Превознесения и купи поводья у квартирмейстера Погга (/way #245 53.0 81.6).",
    ],
  },
  [normalizeMountEnKey("Spectral Steed")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 240,
    faction: "Alliance",
    zone: "Тол Барад (Защитники Тол Барада)",
    requirementsRu:
      "Альянс • Превознесение с Защитниками Тол Барада • 165 Почетных знаков Тол Барада",
    summary:
      "Покупается у квартирмейстера Брейзи на полуострове Тол Барад за 165 рекомендательных значков Тол Барада при Превознесении.",
    steps: [
      "Отправляйся на полуостров Тол Барад через портал в Штормграде.",
      "Выполняй ежедневные задания Защитников Тол Барада до получения Превознесения и 165 Рекомендательных значков.",
      "Купи поводья у квартирмейстера Брейзи в лагере Альянса.",
    ],
  },
  [normalizeMountEnKey("Sunreaver Hawkstrider")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 300,
    faction: "Horde",
    zone: "Ледяная Корона (Серебряный турнир)",
    requirementsRu:
      "Орда • Превознесение с Похитителями Солнца + Чемпион Луносвета • 150 Печатей чемпиона",
    summary:
      "Продается на Ристалище Серебряного турнира у Васарина Рассветного в палатке Орды за 150 Печатей чемпиона.",
    steps: [
      "Начни цепочку Серебряного турнира в Ледяной Короне (/way #118 76.2 19.6) и получи звание Чемпиона своей расы/Луносвета.",
      "Прокачай репутацию с Похитителями Солнца до Превознесения и накопи 150 Печатей чемпиона на ежедневных заданиях.",
      "Купи крылобега у Васарина Рассветного (/way #118 76.2 19.6).",
    ],
  },
  [normalizeMountEnKey("Sunreaver Dragonhawk")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 300,
    faction: "Horde",
    zone: "Ледяная Корона (Серебряный турнир)",
    requirementsRu:
      "Орда • Превознесение с Похитителями Солнца • 150 Печатей чемпиона",
    summary:
      "Летающий дракондор Серебряного турнира за 150 Печатей чемпиона у Васарина Рассветного при Превознесении с Похитителями Солнца.",
    steps: [
      "Открой ежедневные задания Чемпиона на Ристалище Серебряного турнира в Ледяной Короне.",
      "Накопи 150 Печатей чемпиона и купи маунта у Васарина Рассветного в шатре Похитителей Солнца.",
    ],
  },
  [normalizeMountEnKey("Argent Hippogryph")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 300,
    faction: "Both",
    zone: "Ледяная Корона (Серебряный турнир)",
    requirementsRu:
      "Чемпион столицы на Серебряном турнире + Превознесение с Серебряным Авангардом • 150 Печатей чемпиона",
    summary:
      "Покупается у Рос’лины Ривет на Ристалище Серебряного турнира за 150 Печатей чемпиона.",
    steps: [
      "Заверши испытание искателя и стань Чемпионом своей фракции на Серебряном турнире в Ледяной Короне.",
      "Собери 150 Печатей чемпиона за ежедневные задания и купи гиппогрифа у Рос’лины Ривет (/way #118 69.2 23.0).",
    ],
  },
  [normalizeMountEnKey("Argent Warhorse")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 200,
    faction: "Both",
    zone: "Ледяная Корона (Серебряный турнир)",
    requirementsRu:
      "Чемпион столицы на Серебряном турнире + Превознесение с Серебряным Авангардом • 100 Печатей чемпиона",
    summary:
      "Покупается у Рос’лины Ривет на Ристалище Серебряного турнира за 100 Печатей чемпиона.",
    steps: [
      "Получи звание Чемпиона на Серебряном турнире и Превознесение с Серебряным Авангардом.",
      "Купи коня у Рос’лины Ривет (/way #118 69.2 23.0) за 100 Печатей чемпиона.",
    ],
  },
  [normalizeMountEnKey("Argent Charger")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 200,
    faction: "Both",
    zone: "Ледяная Корона (Серебряный турнир)",
    requirementsRu:
      "Только класс: Паладин • Чемпион Серебряного турнира • 100 Печатей чемпиона",
    summary:
      "Эксклюзивный скакун для Паладинов у Дамы Евники Капсалис на Серебряном турнире за 100 Печатей чемпиона.",
    steps: [
      "Зайди персонажем класса Паладин и стань Чемпионом на Серебряном турнире в Ледяной Короне.",
      "Накопи 100 Печатей чемпиона и купи скакуна у Дамы Евники Капсалис (/way #118 69.4 23.2).",
    ],
  },
  [normalizeMountEnKey("Winterspring Frostsaber")]: {
    category: "quest",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 180,
    faction: "Alliance",
    zone: "Зимние Ключи (Скала Ледопардов)",
    requirementsRu:
      "Альянс • 20 ежедневных заданий «Они так быстро растут» (Усы ледопарда: 20 шт.) + 80 золота, 20 кожи и 20 ткани",
    summary:
      "Выращивание детеныша ледопарда у Риверна Холодного Ветра на севере Зимних Ключей за 20 дейликов.",
    steps: [
      "Прилети персонажем Альянса к Риверну Холодному Ветру в Зимних Ключах (/way #83 46.6 17.6) и возьми стартовый квест.",
      "Выполняй ежедневное задание с детенышем 20 дней подряд (собери 20 Усов ледопарда) и сдай финальный квест с 20 грубой кожи, 20 рунами ткани и 80 золотыми.",
    ],
  },
  [normalizeMountEnKey("Venomhide Ravasaur")]: {
    category: "quest",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 180,
    faction: "Horde",
    zone: "Кратер Ун’Горо",
    requirementsRu:
      "Орда • 20 ежедневных заданий «Они так быстро растут» (Молочные зубы ядошкура: 20 шт.) + 80 золота, 20 кожи и 20 ткани",
    summary:
      "Выращивание детеныша ядошкурого равазавра у Мор’века в Кратере Ун’Горо за 20 ежедневных заданий.",
    steps: [
      "Прилети персонажем Орды к Мор’веку на юго-востоке Кратера Ун’Горо (/way #78 71.4 73.8) и возьми задание «Ядовитая кровь».",
      "Вызывай детеныша и выполняй его ежедневное задание 20 раз до получения 20 молочных зубов, после чего сдай финальный квест.",
    ],
  },
  [normalizeMountEnKey("Swift Warstrider")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Horde",
    zone: "Оргриммар (Зал Легенд)",
    requirementsRu:
      "Орда • 15 Почетных знаков (Marks of Honor) за поля боя PvP",
    summary:
      "Покупается у старшего сержанта Голака в Зале Легенд Оргриммара за 15 Почетных знаков.",
    steps: [
      "Заработай 15 Почетных знаков в сундуках за поля боя или потасовки PvP (знаки передаются по отряду).",
      "Зайди в Зал Легенд в Оргриммаре (/way #85 38.2 70.6) и купи поводья у старшего сержанта Голака.",
    ],
  },
  [normalizeMountEnKey("Black War Wolf")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Horde",
    zone: "Оргриммар (Зал Легенд)",
    requirementsRu: "Орда • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у старшего сержанта Голака в Зале Легенд Оргриммара за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков на полях боя и купи у старшего сержанта Голака в Оргриммаре (/way #85 38.2 70.6).",
    ],
  },
  [normalizeMountEnKey("Black War Raptor")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Horde",
    zone: "Оргриммар (Зал Легенд)",
    requirementsRu: "Орда • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у старшего сержанта Голака в Зале Легенд Оргриммара за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков на полях боя и купи у старшего сержанта Голака в Оргриммаре (/way #85 38.2 70.6).",
    ],
  },
  [normalizeMountEnKey("Black War Kodo")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Horde",
    zone: "Оргриммар (Зал Легенд)",
    requirementsRu: "Орда • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у старшего сержанта Голака в Зале Легенд Оргриммара за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков на полях боя и купи у старшего сержанта Голака в Оргриммаре (/way #85 38.2 70.6).",
    ],
  },
  [normalizeMountEnKey("Red Skeletal Warhorse")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Horde",
    zone: "Оргриммар (Зал Легенд)",
    requirementsRu: "Орда • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у старшего сержанта Голака в Зале Легенд Оргриммара за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков на полях боя и купи у старшего сержанта Голака в Оргриммаре (/way #85 38.2 70.6).",
    ],
  },
  [normalizeMountEnKey("Black War Steed")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Alliance",
    zone: "Штормград (Палата Защитников)",
    requirementsRu: "Альянс • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у лейтенанта Картера в Старом городе Штормграда за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков за PvP и купи поводья у лейтенанта Картера в Штормграде (/way #84 76.6 65.8).",
    ],
  },
  [normalizeMountEnKey("Black War Tiger")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Alliance",
    zone: "Штормград (Палата Защитников)",
    requirementsRu: "Альянс • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у лейтенанта Картера в Старом городе Штормграда за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков за PvP и купи поводья у лейтенанта Картера в Штормграде (/way #84 76.6 65.8).",
    ],
  },
  [normalizeMountEnKey("Black War Ram")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Alliance",
    zone: "Штормград (Палата Защитников)",
    requirementsRu: "Альянс • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у лейтенанта Картера в Старом городе Штормграда за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков за PvP и купи поводья у лейтенанта Картера в Штормграде (/way #84 76.6 65.8).",
    ],
  },
  [normalizeMountEnKey("Black War Elekk")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Alliance",
    zone: "Штормград (Палата Защитников)",
    requirementsRu: "Альянс • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у лейтенанта Картера в Старом городе Штормграда за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков за PvP и купи поводья у лейтенанта Картера в Штормграде (/way #84 76.6 65.8).",
    ],
  },
  [normalizeMountEnKey("Black Battlestrider")]: {
    category: "pvp",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Alliance",
    zone: "Штормград (Палата Защитников)",
    requirementsRu: "Альянс • 15 Почетных знаков (Marks of Honor)",
    summary:
      "Покупается у лейтенанта Картера в Старом городе Штормграда за 15 Почетных знаков.",
    steps: [
      "Собери 15 Почетных знаков за PvP и купи поводья у лейтенанта Картера в Штормграде (/way #84 76.6 65.8).",
    ],
  },
  [normalizeMountEnKey("Ashes of Al'ar")]: {
    category: "raid",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: false,
    timeMinutes: 10,
    faction: "Both",
    zone: "Пустоверть (Крепость Бурь: Око)",
    requirementsRu:
      "Подписка (Вход в рейд 30+ ур.) • Дроп ~1.7% с Кель’таса Солнечного Скитальца (1 раз в неделю на персонажа)",
    summary:
      "Выпадает с финального босса Кель’таса Солнечного Скитальца в рейде Крепость Бурь (Пустоверть) или из сундука Путешествий во времени TBC.",
    steps: [
      "Прилети в Пустоверть (Запределье) и зайди в центральный корабль Крепости Бурь (/way #109 73.6 63.7).",
      "Пробеги прямо к залу Кель’таса Солнечного Скитальца, победи 4 советников, оружие и самого Кель’таса.",
    ],
  },
  [normalizeMountEnKey("Invincible")]: {
    category: "raid",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: false,
    timeMinutes: 20,
    faction: "Both",
    zone: "Ледяная Корона (Цитадель Ледяной Короны)",
    requirementsRu:
      "Подписка • Режим: ТОЛЬКО 25 игроков (Героический) • Дроп ~1% с Короля-лича (1 раз в неделю)",
    summary:
      "Выпадает с Короля-лича в Цитадели Ледяной Короны строго на сложности 25 игроков (Героический).",
    steps: [
      "Перед входом в Цитадель Ледяной Короны (/way #118 53.8 87.0) установи сложность рейда: 25 игроков (Героический).",
      "Зачисти кварталы цитадели (Валитрию Сноходицу можно просто обойти стороной, если нет исцеления) и победи Короля-лича на вершине.",
    ],
  },
  [normalizeMountEnKey("Mimiron's Head")]: {
    category: "raid",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: false,
    timeMinutes: 18,
    faction: "Both",
    zone: "Грозовая Гряда (Ульдуар)",
    requirementsRu:
      "Подписка • Условие боя: «Один во мраке» (НЕ говорить с 4 хранителями перед боем с Йогг-Сароном) • Дроп ~1%",
    summary:
      "Выпадает с Йогг-Сарона в Ульдуаре, если убить его без помощи всех 4 Хранителей (Торима, Фрейи, Ходира и Мимирона).",
    steps: [
      "Зайди в рейд Ульдуар в Грозовой Гряде (/way #120 41.6 17.8) и освободи 4 Хранителей, но НЕ разговаривай с ними в центральном кольце.",
      "Спустись к Йогг-Сарону, зайди в порталы мозга во 2-й фазе и добей босса в одиночку.",
    ],
  },
  [normalizeMountEnKey("Raven Lord")]: {
    category: "dungeon",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 6,
    faction: "Both",
    zone: "Лес Тероккар (Сетеккские залы)",
    requirementsRu:
      "Доступно на Триале • Режим подземелья: ТОЛЬКО Героический (1 раз в день) • Дроп ~1.5% с Анзу",
    summary:
      "Выпадает с босса Анзу в героическом режиме подземелья Сетеккские залы (Аукиндун, Лес Тероккар). Друид больше не нужен — Анзу стоит в зале всегда.",
    steps: [
      "Установи сложность подземелий на «Героический» и войди в Сетеккские залы в Лесу Тероккар (/way #108 44.3 65.6).",
      "Добеги до зала перед последним боссом и убей Анзу (сброс КД — ежедневно утром).",
    ],
  },
  [normalizeMountEnKey("Swift White Hawkstrider")]: {
    category: "dungeon",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Остров Кель’Данас (Терраса Магистров)",
    requirementsRu:
      "Доступно на Триале • Режим подземелья: ТОЛЬКО Героический (1 раз в день) • Дроп ~4% с Кель’таса",
    summary:
      "Выпадает с финального босса Кель’таса Солнечного Скитальца в героическом режиме подземелья Терраса Магистров.",
    steps: [
      "Переместись на Остров Кель’Данас (портал из Шаттрата) и поставь сложность подземелий «Героический».",
      "Зайди в Террасу Магистров (/way #122 61.2 30.9), пробеги до последнего зала и победи Кель’таса.",
    ],
  },
  [normalizeMountEnKey("Rivendare's Deathcharger")]: {
    category: "dungeon",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 7,
    faction: "Both",
    zone: "Восточные Чумные земли (Стратхольм)",
    requirementsRu:
      "Доступно на Триале • Режим: Обычный (можно обновлять до 10 раз в час!) • Дроп ~1% с Лорда Аурия Ривендера",
    summary:
      "Выпадает с Лорда Аурия Ривендера в восточной части Стратхольма (Черный ход). Подземелье можно сбрасывать до 10 раз в час.",
    steps: [
      "Войди через восточный вход («Черный ход») в Стратхольм (/way #23 43.4 19.4).",
      "Убей 3 боссов у башен зиккуратов, зачисти поганищ на площади и победи Лорда Аурия Ривендера в склепе.",
    ],
  },
  [normalizeMountEnKey("Blue Proto-Drake")]: {
    category: "dungeon",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Ревущий фьорд (Вершина Утгард)",
    requirementsRu:
      "Доступно на Триале • Режим подземелья: ТОЛЬКО Героический (1 раз в день) • Дроп ~1.5% со Скади Безжалостного",
    summary:
      "Выпадает с 3-го босса Скади Безжалостного в героическом режиме подземелья Вершина Утгард.",
    steps: [
      "Поставь сложность подземелий «Героический» и войди в Вершину Утгард в Ревущем фьорде (/way #117 57.3 46.6).",
      "В коридоре со Скади подними 3 гарпуна с мобов, выстрели из пушек по его дракону и убей Скади.",
    ],
  },
  [normalizeMountEnKey("Green Proto-Drake")]: {
    category: "reputation",
    noRepRequired: false,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 60,
    faction: "Both",
    zone: "Низина Шолазар (Приют Гласа Дождя)",
    requirementsRu:
      "Почтение с фракцией Оракулы (Низина Шолазар) • Вылупляется с шансом ~5% из Таинственного яйца (зреет 3 дня)",
    summary:
      "Выпадает из Треснувшего яйца у квартирмейстера Гин’кажа в Низине Шолазар при Почтении с Оракулами.",
    steps: [
      "Пройди цепочку заданий в Низине Шолазар и в пещере Аругала спаси Оракула (чтобы выбрать фракцию Оракулов).",
      "Прокачай репутацию до Почтения и покупай Таинственное яйцо у Гин’кажа (/way #119 54.6 56.3) раз в 3 дня.",
    ],
  },
  [normalizeMountEnKey("Vitreous Stone Drake")]: {
    category: "dungeon",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Подземье (Каменные Недра)",
    requirementsRu:
      "Доступно на Триале • Режим: Обычный (до 10 заходов в час) или Героический • Дроп ~1% с Камнешкура",
    summary:
      "Выпадает со 2-го босса Камнешкура в подземелье Каменные Недра в Подземье (падает даже в обычном режиме без КД!).",
    steps: [
      "Прыгни в портал Подземья в Оргриммаре/Штормграде и взлети ко входу в Каменные Недра (/way #207 47.6 52.0).",
      "Убей 2-го босса Камнешкура, используй телепорт у входа, обнови подземелье и повтори (до 10 раз в час).",
    ],
  },
  [normalizeMountEnKey("Drake of the North Wind")]: {
    category: "dungeon",
    noRepRequired: true,
    isOneTime: false,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Ульдум (Вершина Смерча)",
    requirementsRu:
      "Доступно на Триале • Режим: Обычный (до 10 заходов в час) или Героический • Дроп ~1% с Альтаирия",
    summary:
      "Выпадает со 2-го босса Альтаирия в подземелье Вершина Смерча в небе над Ульдумом (падает в обычном режиме!).",
    steps: [
      "Взлети в облака на юго-востоке Ульдума ко входу в Вершину Смерча (/way #249 76.6 84.4).",
      "Добеги до 2-го босса Альтаирия, убей его, спрыгни с платформы (перенесет ко входу), обнови подземелье и повтори.",
    ],
  },
  [normalizeMountEnKey("Fossilized Raptor")]: {
    category: "puzzle",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 120,
    faction: "Both",
    zone: "Калимдор / Восточные королевства (Археология)",
    requirementsRu:
      "Профессия: Археология (100+ навык) • Редкая находка ветки «Окаменелости» (100 фрагментов)",
    summary:
      "Собирается как редкий артефакт ветки «Окаменелости» во вспомогательной профессии Археология.",
    steps: [
      "Обучись Археологии у тренера в столице и раскапывай места раскопок в Калимдоре или Пандарии (для обмена ящиков у Бранна Бронзоборода на фрагменты окаменелостей).",
      "Собирай артефакты ветки «Окаменелости», пока в журнале не появится проект «Ископаемый ящер» (100 фрагментов).",
    ],
  },
  [normalizeMountEnKey("Spirit of Eche'ro")]: {
    category: "quest",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 45,
    faction: "Both",
    zone: "Крутогорье (Раскопки Легиона)",
    requirementsRu:
      "Профессия: Археология (1 навык) • Доступен раз в 6 месяцев по двухнедельному квесту «На правильном пути» в Даларане (Legion)",
    summary:
      "100% награда за сбор 600 Костей Эче’ро в Крутогорье во время активной недели археологического квеста в Даларане.",
    steps: [
      "В неделю активности квеста возьми задание у Даринесс Сведущей в Даларане Расколотых островов (/way #627 40.8 26.4).",
      "Собери 600 Костей Эче’ро на раскопках в Крутогорье за ~40 минут и получи призрачного лося.",
    ],
  },
  [normalizeMountEnKey("Bone-White Primal Raptor")]: {
    category: "quest",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 90,
    faction: "Both",
    zone: "Остров Великанов (Пандария)",
    requirementsRu:
      "0 репутации • Собрать 9 999 Гигантских костей динозавров (или купить их на Аукционе!)",
    summary:
      "Выдается за сдачу 9 999 Гигантских костей динозавров Ку’ме в пещере на Острове Великанов (кости передаются и продаются на Аукционе).",
    steps: [
      "Нафарми 9 999 Гигантских костей динозавров на Острове Великанов к северу от Вершины Кунь-Лай (или купи 10 стаков костей прямо на Аукционе!).",
      "Отнеси кости троллю Ку’ме в пещере на западе Острова Великанов (/way #507 32.6 54.0) и сдай квест «Гора гигантских костей динозавров».",
    ],
  },
  [normalizeMountEnKey("Armored Brown Bear")]: {
    category: "vendor",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 3,
    faction: "Both",
    zone: "Даларан Нордскола (Лавка диковинных животных)",
    requirementsRu:
      "0 репутации • Стоимость: 750 золотых (600 золотых при Превознесении с Кирин-Тором)",
    summary:
      "Продается сразу за золото у Мей Франкис в Даларане Нордскола без репутации и квестов.",
    steps: [
      "Прилети в Даларан над Лесом Хрустальной Песни в Нордсколе.",
      "Подойди к Мей Франкис у входа в Красарус (/way #125 58.2 42.4) и купи поводья за 600–750 золотых.",
    ],
  },
  [normalizeMountEnKey("Traveler's Tundra Mammoth")]: {
    category: "vendor",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: false,
    timeMinutes: 3,
    faction: "Both",
    zone: "Даларан Нордскола (Лавка диковинных животных)",
    requirementsRu:
      "0 репутации • Стоимость: 20 000 золотых (16 000 золотых при Превознесении с Кирин-Тором)",
    summary:
      "Трехместный мамонт с двумя личными торговцами и починкой. Покупается у Мей Франкис в Даларане Нордскола.",
    steps: [
      "Подойди к Мей Франкис в Даларане Нордскола (/way #125 58.2 42.4) и купи мамонта за 16 000–20 000 золотых.",
    ],
  },
  [normalizeMountEnKey("Grand Expedition Yak")]: {
    category: "vendor",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: false,
    timeMinutes: 5,
    faction: "Both",
    zone: "Вершина Кунь-Лай (Пандария)",
    requirementsRu: "0 репутации • Стоимость: 120 000 золотых",
    summary:
      "Як с личным трансмогрификатором и торговцем починкой у Дядюшки Толстая Сума на Вершине Кунь-Лай.",
    steps: [
      "Прилети на стоянку груммелей у Перевала Кунь-Лай (/way #379 65.4 61.8) и купи поводья у Дядюшки Толстая Сума.",
    ],
  },
  [normalizeMountEnKey("Blonde Riding Yak")]: {
    category: "vendor",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Вершина Кунь-Лай (Пандария)",
    requirementsRu: "0 репутации • Стоимость: 3 000 золотых",
    summary:
      "Покупается напрямую за 3 000 золотых у Дядюшки Толстая Сума на Вершине Кунь-Лай без репутации.",
    steps: [
      "Прилети на стоянку груммелей на Вершине Кунь-Лай (/way #379 65.4 61.8) и купи у Дядюшки Толстая Сума.",
    ],
  },
  [normalizeMountEnKey("Grey Riding Yak")]: {
    category: "vendor",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Вершина Кунь-Лай (Пандария)",
    requirementsRu: "0 репутации • Стоимость: 3 000 золотых",
    summary:
      "Покупается напрямую за 3 000 золотых у Дядюшки Толстая Сума на Вершине Кунь-Лай без репутации.",
    steps: [
      "Прилети на стоянку груммелей на Вершине Кунь-Лай (/way #379 65.4 61.8) и купи у Дядюшки Толстая Сума.",
    ],
  },
  [normalizeMountEnKey("Subdued Seahorse")]: {
    category: "rare100",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 15,
    faction: "Both",
    zone: "Вайш’ир (Мерцающий простор / Бездонная пучина)",
    requirementsRu:
      "0 репутации • 100% дроп с редкого моба Посейдус (или покупка на Аукционе, т.к. предмет НЕ привязан при получении!)",
    summary:
      "Выпадает со 100% шансом с редкого морского конька Посейдуса в Вайш’ире (работает в любых водоемах игры!) либо покупается на Аукционе.",
    steps: [
      "Облети на подводном коньке 5 точек респауна Посейдуса в Вайш’ире (/way #205 39.8 67.6, #204 66.0 43.0) или проверь лот «Поводья прирученного морского конька» на Аукционе.",
    ],
  },
  [normalizeMountEnKey("Coalfist Gronnling")]: {
    category: "treasure",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: true,
    timeMinutes: 5,
    faction: "Both",
    zone: "Дренор (Гарнизон / Аукцион)",
    requirementsRu:
      "0 репутации • За задание соратников Гарнизона «Разрушитель преград» ИЛИ покупка на Аукционе за 300–900 золотых (BOE)",
    summary:
      "Передаваемый предмет! Можно за 1 минуту купить на Аукционе за гроши или получить со стола соратников Гарнизона Дренора.",
    steps: [
      "Открой Аукцион в любой столице и введи «Кулак Черного Кулака» (стоит копейки) — либо выполни миссию соратников в Гарнизоне 3-го уровня.",
    ],
  },
};

// Intelligent rule-based Wowhead Guide & Requirements builder for ALL catalog mounts
function buildWowheadGuideAndRequirements(
  rawItem,
  catName,
  subcatName,
  nameRu
) {
  const nameEn = rawItem?.name || "";
  const normEn = normalizeMountEnKey(nameEn);

  // 1. Check exact Wowhead Mount Guide dictionary first
  if (normEn && WOWHEAD_EXACT_MOUNT_GUIDES[normEn]) {
    return WOWHEAD_EXACT_MOUNT_GUIDES[normEn];
  }

  const fullCtx = `${catName} ${subcatName} ${nameEn}`.toLowerCase();

  const requiresSub =
    fullCtx.includes("raid") ||
    fullCtx.includes("gladiator") ||
    fullCtx.includes("vicious") ||
    fullCtx.includes("mythic") ||
    fullCtx.includes("keystone") ||
    fullCtx.includes("glory of the") ||
    fullCtx.includes("brawler") ||
    fullCtx.includes("mage tower") ||
    fullCtx.includes("torghast") ||
    fullCtx.includes("protoform");

  // 2. Strict Capital Racial Vendors
  if (STRICT_RACIAL_VENDOR_WHITELIST.has(normEn)) {
    const isAlliance =
      fullCtx.includes("horse") ||
      fullCtx.includes("steed") ||
      fullCtx.includes("ram") ||
      fullCtx.includes("saber") ||
      fullCtx.includes("mechanostrider") ||
      fullCtx.includes("elekk") ||
      fullCtx.includes("gryphon");
    const isSwift =
      fullCtx.includes("swift") ||
      fullCtx.includes("great") ||
      fullCtx.includes("turbo") ||
      fullCtx.includes("warhorse");
    return {
      category: "vendor",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: true,
      timeMinutes: 2,
      difficulty: "1/5 (Базовый расовый торговец столицы за 1–10 золотых)",
      faction: isAlliance ? "Alliance" : "Horde",
      zone: isAlliance
        ? "Штормград / Стальгорн / Дарнас"
        : "Оргриммар / Луносвет / Подгород",
      zoneEn: isAlliance
        ? "Stormwind / Ironforge / Darnassus"
        : "Orgrimmar / Silvermoon / Undercity",
      requirementsRu: `${isAlliance ? "Альянс" : "Орда"} • Уровень: ${
        isSwift ? "20+" : "10+"
      } • Стоимость: ${
        isSwift ? "10 золотых" : "1 золотой"
      } (или Превознесение со столицей для другой расы)`,
      requirementsEn: `${isAlliance ? "Alliance" : "Horde"} • Level: ${
        isSwift ? "20+" : "10+"
      } • Cost: ${
        isSwift ? "10 Gold" : "1 Gold"
      } (or Exalted with capital for other races)`,
      summary: `Покупается напрямую у базового расового торговца верховыми животными за ${
        isSwift ? "10 золотых" : "1 золотой"
      } (персонаж соответствующей расы покупает без репутации).`,
      summaryEn: `Purchased directly from the capital racial mount vendor for ${
        isSwift ? "10 Gold" : "1 Gold"
      } (characters of the matching race require 0 reputation).`,
      steps: [
        `Подойди к расовому торговцу маунтами (нажми «📌 Булавка» на карточке для постановки метки на карту).`,
        `Купи поводья за ${
          isSwift ? "10 золотых" : "1 золотой"
        } и изучи маунта — он сразу станет доступен всем персонажам аккаунта.`,
      ],
      stepsEn: [
        `Visit the capital racial mount vendor (click "📌 Map Pin" on the card to set an in-game map waypoint).`,
        `Purchase the mount for ${
          isSwift ? "10 Gold" : "1 Gold"
        } and learn it — it immediately unlocks account-wide.`,
      ],
    };
  }

  // 3. Argent Tournament
  if (
    fullCtx.includes("argent") ||
    fullCtx.includes("tournament") ||
    fullCtx.includes("sunreaver") ||
    fullCtx.includes("quel'dorei") ||
    fullCtx.includes("silver covenant")
  ) {
    return {
      category: "reputation",
      noRepRequired: false,
      isOneTime: true,
      trialCompatible: true,
      timeMinutes: 240,
      difficulty: "3/5 (Серебряный турнир — Печати чемпиона)",
      faction: fullCtx.includes("sunreaver")
        ? "Horde"
        : fullCtx.includes("silver covenant") || fullCtx.includes("quel'dorei")
        ? "Alliance"
        : "Both",
      zone: "Ледяная Корона (Ристалище Серебряного турнира)",
      zoneEn: "Icecrown (Argent Tournament Grounds)",
      requirementsRu:
        "Звание Чемпиона города на Серебряном турнире + Превознесение • Валюта: 5–150 Печатей чемпиона",
      requirementsEn:
        "Argent Tournament City Champion + Exalted • Currency: 5–150 Champion's Seals",
      summary:
        "Покупается у интенданта фракции в павильоне Серебряного турнира на севере Ледяной Короны за Печати чемпиона.",
      summaryEn:
        "Purchased from the faction quartermaster at the Argent Tournament Grounds in northern Icecrown for Champion's Seals.",
      steps: [
        "Прилети на Ристалище Серебряного турнира на севере Ледяной Короны (/way #118 76.2 19.6) и пройди испытания Искателя и Чемпиона.",
        "Выполняй ежедневные задания Чемпиона для получения Печатей чемпиона и купи поводья у интенданта своего города.",
      ],
      stepsEn: [
        "Fly to the Argent Tournament Grounds in northern Icecrown (/way #118 76.2 19.6) and complete the Valiant and Champion trials.",
        "Complete daily Champion quests to earn Champion's Seals and buy the mount from your city quartermaster.",
      ],
    };
  }

  // 4. Netherwing / Sha'tari Skyguard / Kurenai / Mag'har / Cenarion (Outland TBC Reputations)
  if (
    fullCtx.includes("netherwing") ||
    fullCtx.includes("nether ray") ||
    fullCtx.includes("talbuk") ||
    fullCtx.includes("cenarion war hippogryph")
  ) {
    return {
      category: "reputation",
      noRepRequired: false,
      isOneTime: true,
      trialCompatible: true,
      timeMinutes: 180,
      difficulty: "3/5 (Репутация Запределья — Превознесение)",
      faction: "Both",
      zone: `Запределье (${subcatName || catName})`,
      zoneEn: `Outland (${subcatName || catName})`,
      requirementsRu: `Превознесение с фракцией (${
        subcatName || "Запределье"
      }) • Стоимость: 70–1 600 золотых (или жетоны Путешествий во времени TBC)`,
      requirementsEn: `Exalted with ${
        subcatName || "Outland Faction"
      } • Cost: 70–1,600 Gold (or TBC Timewalking Commendations)`,
      summary: `Продается у интенданта фракции в Запределье после достижения Превознесения (быстрее всего прокачать жетонами репутации на неделе Путешествий во времени TBC).`,
      summaryEn: `Sold by the faction quartermaster in Outland upon reaching Exalted reputation (fastest via TBC Timewalking reputation commendations).`,
      steps: [
        `Прокачай репутацию (${
          subcatName || catName
        }) до Превознесения на заданиях в Запределье или купи Знаки репутации у Купри в Шаттрате во время TBC Timewalking.`,
        `Купи маунта у интенданта фракции (нажми «📌 Булавка» для точной метки на карте).`,
      ],
      stepsEn: [
        `Reach Exalted with ${
          subcatName || catName
        } via Outland quests or buy Reputation Commendations from Cupri in Shattrath during TBC Timewalking.`,
        `Purchase the mount from the faction quartermaster (click "📌 Map Pin" for exact coordinates).`,
      ],
    };
  }

  // 5. Protoform Synthesis (Zereth Mortis)
  if (
    fullCtx.includes("protoform") ||
    fullCtx.includes("vombata") ||
    fullCtx.includes("bufonid") ||
    fullCtx.includes("helicid") ||
    fullCtx.includes("vespoid") ||
    fullCtx.includes("aurelid") ||
    fullCtx.includes("lupine") ||
    fullCtx.includes("cervid")
  ) {
    return {
      category: "puzzle",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: false,
      timeMinutes: 60,
      difficulty: "3/5 (Протоформный синтез — Зерет Мортис)",
      faction: "Both",
      zone: "Зерет Мортис (Кузня Протоформного синтеза)",
      zoneEn: "Zereth Mortis (Protoform Synthesis Forge)",
      requirementsRu:
        "Подписка • Открытая кузня синтеза маунтов в Зерет Мортисе + Схема + Бытие пылинок (300–500 шт.) + Редкий реагент",
      requirementsEn:
        "Subscription • Unlocked Mount Synthesis Forge in Zereth Mortis + Schematic + Genesis Motes (300–500) + Rare Lattice",
      summary:
        "Создается в Кузне Протоформного синтеза в Зерет Мортисе из схемы, пылинок Бытия и 1 редкого компонента.",
      summaryEn:
        "Crafted at the Protoform Synthesis Forge in Zereth Mortis using a schematic, Genesis Motes, and a creature lattice.",
      steps: [
        "Открой исследование «Синтез средств передвижения» в Консоли шифров в Приюте Пилигрима (/way #1970 34.8 64.2).",
        "Найди схему этого маунта в Зерет Мортисе, собери Бытие пылинок с мобов и создай маунта в Кузне синтеза (/way #1970 61.6 41.2).",
      ],
      stepsEn: [
        'Unlock "Dealic Understanding" & Mount Synthesis at the Cypher Console in Haven (/way #1970 34.8 64.2).',
        "Collect the mount schematic in Zereth Mortis, farm Genesis Motes, and craft the mount at the Synthesis Forge (/way #1970 61.6 41.2).",
      ],
    };
  }

  // 6. Timerunning: Pandaria (Bronze) / Trading Post (Trader's Tender)
  if (fullCtx.includes("trading post") || fullCtx.includes("bronze")) {
    const isTradingPost = fullCtx.includes("trading post");
    return {
      category: "vendor",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: !isTradingPost,
      timeMinutes: 15,
      difficulty: isTradingPost
        ? "1/5 (Торговая лавка столицы)"
        : "2/5 (Ивент / Торговец за бронзу)",
      faction: "Both",
      zone: isTradingPost
        ? "Оргриммар / Штормград (Торговая лавка)"
        : "Вечноцветущий дол / Базар Бесконечности",
      zoneEn: isTradingPost
        ? "Orgrimmar / Stormwind (Trading Post)"
        : "Vale of Eternal Blossoms / Infinite Bazaar",
      requirementsRu: isTradingPost
        ? "Торговая лавка (Оргриммар / Штормград) • Валюта: 400–800 Торговых жетонов (в ротации месяца)"
        : "Событие Timerunning • Валюта: Бронза у Хэмет Нессингвари-мл. на Базаре Бесконечности",
      requirementsEn: isTradingPost
        ? "Trading Post (Orgrimmar / Stormwind) • Currency: 400–800 Trader's Tender (monthly rotation)"
        : "Timerunning Event • Currency: Bronze from Hemet Nesingwary XVII at the Infinite Bazaar",
      summary: isTradingPost
        ? "Приобретается за Торговые жетоны в Торговой лавке Оргриммара или Штормграда, когда маунт появляется в ежемесячном ассортименте."
        : "Приобретается за Бронзу на Базаре Бесконечности во время события Remix.",
      summaryEn: isTradingPost
        ? "Purchased with Trader's Tender at the Orgrimmar or Stormwind Trading Post when featured in the monthly rotation."
        : "Purchased with Bronze at the Infinite Bazaar during the Timerunning Remix event.",
      steps: [
        isTradingPost
          ? "Выполняй задачи в «Журнале путешественника» (Shift+J) для получения Торговых жетонов каждый месяц."
          : "Накопи Бронзу за прохождение активностей события.",
        isTradingPost
          ? "Купи маунта у поставщиков Торговой лавки в Оргриммаре (/way #85 48.2 76.0) или Штормграде (/way #84 52.4 72.8)."
          : "Обменяй Бронзу у торговца маунтами на Базаре Бесконечности.",
      ],
      stepsEn: [
        isTradingPost
          ? "Complete monthly tasks in the Traveler's Log (Shift+J) to earn Trader's Tender."
          : "Earn Bronze from Timerunning activities and dungeons.",
        isTradingPost
          ? "Buy the mount from the Trading Post vendors in Orgrimmar (/way #85 48.2 76.0) or Stormwind (/way #84 52.4 72.8)."
          : "Exchange Bronze at the mount vendor in the Infinite Bazaar.",
      ],
    };
  }

  // 7. Timewalking (5000 Timewarped Badges)
  if (
    fullCtx.includes("timewalking") ||
    fullCtx.includes("timewarped") ||
    fullCtx.includes("timereaver")
  ) {
    const isTimereaver = fullCtx.includes("timereaver");
    return {
      category: isTimereaver ? "dungeon" : "vendor",
      noRepRequired: true,
      isOneTime: !isTimereaver,
      trialCompatible: true,
      timeMinutes: 90,
      difficulty: isTimereaver
        ? "3/5 (Дроп с любого босса Путешествий во времени)"
        : "2/5 (5 000 Искаженных временем знаков)",
      faction: "Both",
      zone: `Путешествия во времени (${subcatName || catName})`,
      zoneEn: `Timewalking (${subcatName || catName})`,
      requirementsRu: isTimereaver
        ? "Активная неделя Путешествий во времени • Персональный дроп (~0.05%) с ЛЮБОГО босса подземелья Timewalking"
        : "Активная неделя Путешествий во времени • Стоимость: 5 000 Искаженных временем знаков",
      requirementsEn: isTimereaver
        ? "Active Timewalking Week • Personal drop (~0.05%) from ANY Timewalking dungeon boss"
        : "Active Timewalking Week • Cost: 5,000 Timewarped Badges",
      summary: isTimereaver
        ? "Может выпасть с любого босса в любом подземелье Путешествий во времени (Timewalking) во время активного недельного события."
        : "Покупается за 5 000 Искаженных временем знаков у продавца Путешествий во времени в столице соответствующего дополнения.",
      summaryEn: isTimereaver
        ? "Can drop from any boss inside any Timewalking dungeon during an active Timewalking weekly event."
        : "Purchased for 5,000 Timewarped Badges from the Timewalking vendor in the corresponding expansion hub.",
      steps: [
        "Дождись недели Путешествий во времени в календаре игры и выполни разовый квест с последнего босса подземелья на +500 знаков.",
        isTimereaver
          ? "Проходи подземелья через поиск группы — шанс выпадения есть с каждого убитого босса."
          : "Подойди к продавцу Путешествий во времени (Шаттрат / Даларан / Штормград / Оргриммар) и купи маунта за 5 000 знаков.",
      ],
      stepsEn: [
        "Wait for an active Timewalking week on the in-game calendar and turn in the one-time quest item from your first dungeon for +500 badges.",
        isTimereaver
          ? "Queue for Timewalking dungeons via Group Finder — every boss has a chance to drop the mount."
          : "Visit the Timewalking vendor (Shattrath / Dalaran / Stormwind / Orgrimmar) and buy the mount for 5,000 Timewarped Badges.",
      ],
    };
  }

  // 8. Legion Class Mounts & Class Mounts
  if (
    fullCtx.includes("class") ||
    fullCtx.includes("order hall") ||
    fullCtx.includes("felscorned")
  ) {
    return {
      category: "quest",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: true,
      timeMinutes: 60,
      difficulty: "2/5 (Классовая кампания оплота Legion)",
      faction: "Both",
      zone: "Расколотый берег / Оплот класса (Legion)",
      zoneEn: "Broken Shore / Class Order Hall (Legion)",
      requirementsRu:
        "Персонаж соответствующего класса • Завершение кампании Оплота класса и достижения «Проникновение в Гробницу» на Расколотом берегу",
      requirementsEn:
        'Matching Class Character • Complete your Class Order Hall Campaign and "Breaching the Tomb" on the Broken Shore',
      summary:
        "Классовый маунт Legion: выдается за прохождение кампании Оплота своего класса и цепочки «Проникновение в Гробницу» у Кадгара на Расколотом берегу.",
      summaryEn:
        'Legion Class Mount: awarded for completing your Class Order Hall campaign and the "Breaching the Tomb" questline on the Broken Shore.',
      steps: [
        "Заверши основную кампанию Оплота своего класса в дополнении Legion.",
        "На Расколотом берегу выполни цепочку «Проникновение в Гробницу» и возьми финальное задание на классового маунта.",
      ],
      stepsEn: [
        "Complete your Class Order Hall campaign in Legion.",
        'Finish the "Breaching the Tomb" achievement on the Broken Shore and complete the final class mount scenario.',
      ],
    };
  }

  // 9. Shadowlands Covenants (Kyrian, Venthyr, Night Fae, Necrolord)
  if (
    fullCtx.includes("covenant") ||
    fullCtx.includes("kyrian") ||
    fullCtx.includes("venthyr") ||
    fullCtx.includes("night fae") ||
    fullCtx.includes("necrolord") ||
    fullCtx.includes("renown")
  ) {
    const isDragonflightOrTwwRenown =
      fullCtx.includes("dragonflight") ||
      fullCtx.includes("war within") ||
      fullCtx.includes("severed threads") ||
      fullCtx.includes("hallowfall") ||
      fullCtx.includes("council of dornogal") ||
      fullCtx.includes("assembly of the deeps") ||
      fullCtx.includes("iskaara") ||
      fullCtx.includes("maruuk") ||
      fullCtx.includes("valdrakken") ||
      fullCtx.includes("dragonscale") ||
      fullCtx.includes("loamm") ||
      fullCtx.includes("dream wardens");

    if (isDragonflightOrTwwRenown) {
      return {
        category: "reputation",
        noRepRequired: false,
        isOneTime: true,
        trialCompatible: false,
        timeMinutes: 150,
        difficulty: "2/5 (Известность фракции на весь отряд)",
        faction: "Both",
        zone: `${catName} — ${subcatName}`,
        zoneEn: `${catName} — ${subcatName}`,
        requirementsRu: `Уровень Известности фракции (${
          subcatName || catName
        }, общая на весь отряд) • Валюта: Припасы Драконьих островов / Кристаллы резонанса`,
        requirementsEn: `Warband Renown Rank (${
          subcatName || catName
        }) • Currency: Dragon Isles Supplies / Resonance Crystals`,
        summary: `Открывается за повышение уровня Известности фракции (${subcatName}) и покупается у интенданта фракции (известность распространяется на весь отряд).`,
        summaryEn: `Unlocked by raising Warband Renown with ${
          subcatName || catName
        } and purchased from the Renown quartermaster.`,
        steps: [
          `Повысь Известность с фракцией «${
            subcatName || catName
          }» на локальных заданиях и еженедельных событиях.`,
          `Подойди к интенданту известности в лагере фракции и приобрети маунта за валюту дополнения.`,
        ],
        stepsEn: [
          `Increase your Renown with ${
            subcatName || catName
          } through world quests and weekly zone events.`,
          `Visit the faction Renown quartermaster and purchase the mount with zone currency.`,
        ],
      };
    }

    return {
      category: "reputation",
      noRepRequired: false,
      isOneTime: true,
      trialCompatible: false,
      timeMinutes: 120,
      difficulty: "2/5 (Ковенант Shadowlands — Анима / Известность)",
      faction: "Both",
      zone: `Shadowlands (${subcatName || "Обитель ковенанта"})`,
      zoneEn: `Shadowlands (${subcatName || "Covenant Sanctum"})`,
      requirementsRu: `Вступление в ковенант (${
        subcatName || "Shadowlands"
      }) • Уровень известности 39–70 • Запасенная анима (1 000–7 500 ед.) и Благодарные подношения`,
      requirementsEn: `Join Covenant (${
        subcatName || "Shadowlands"
      }) • Renown 39–70 • Reservoir Anima (1,000–7,500) & Grateful Offerings`,
      summary: `Награда ковенанта Shadowlands (${subcatName}): выдается автоматически за уровень Известности или покупается у интенданта ковенанта за Запасенную аниму.`,
      summaryEn: `Shadowlands Covenant reward (${subcatName}): granted automatically via Renown or purchased from the Covenant quartermaster for Reservoir Anima.`,
      steps: [
        "В Орибосе купи у Ау’дара (рядом с распорядителем полетов) предмет на мгновенное повышение Известности ковенанта до 60 уровня за 500 золотых.",
        "Пройди рейд Замок Нафрия / Святилище Господства для быстрого сбора Запасенной анимы и купи маунта в обители ковенанта.",
      ],
      stepsEn: [
        "In Oribos, buy the instant Renown 60 boost item from Au'Dara (next to the flight master) for 500 Gold.",
        "Clear Castle Nathria / Sanctum of Domination for quick Reservoir Anima and buy the mount inside your Covenant Sanctum.",
      ],
    };
  }

  // 10. Reputation / Paragon
  if (fullCtx.includes("reputation") || fullCtx.includes("paragon")) {
    const isParagon = fullCtx.includes("paragon");
    return {
      category: "reputation",
      noRepRequired: false,
      isOneTime: !isParagon,
      trialCompatible: !requiresSub,
      timeMinutes: 180,
      difficulty: isParagon
        ? "4/5 (Сундук идеала — каждые 10 000 репы сверх Превознесения)"
        : "3/5 (Превознесение с фракцией)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      zoneEn: `${catName} — ${subcatName}`,
      requirementsRu: isParagon
        ? `Превознесение с фракцией (${subcatName}) + каждые 10 000 репутации идеала • Шанс из припасов фракции: ~5%`
        : `Репутация: Превознесение (${
            subcatName || catName
          }) • Покупка у интенданта фракции за золото или валюту зоны`,
      requirementsEn: isParagon
        ? `Exalted with ${subcatName} + every 10,000 Paragon reputation • ~5% drop chance from Paragon cache`
        : `Reputation: Exalted (${
            subcatName || catName
          }) • Purchased from faction quartermaster`,
      summary: isParagon
        ? `Выпадает с шансом ~5% из сундука припасов идеала за каждые 10 000 репутации, набранные сверх Превознесения (${subcatName}).`
        : `Покупается у интенданта фракции (${
            subcatName || catName
          }) после достижения уровня репутации «Превознесение».`,
      summaryEn: isParagon
        ? `Drops (~5% chance) from the Paragon supply cache earned for every 10,000 reputation beyond Exalted with ${subcatName}.`
        : `Purchased from the ${
            subcatName || catName
          } quartermaster after reaching Exalted reputation.`,
      steps: [
        `Прокачай репутацию (${
          subcatName || catName
        }) до Превознесения (используй жетоны Путешествий во времени или контракты на локальные задания).`,
        isParagon
          ? "Продолжай набирать по 10 000 репутации для получения сундука припасов у интенданта."
          : "Подойди к интенданту фракции (нажми «📌 Булавка» на карточке) и купи маунта.",
      ],
      stepsEn: [
        `Reach Exalted reputation with ${
          subcatName || catName
        } (use Timewalking commendations or world quest contracts).`,
        isParagon
          ? "Continue earning 10,000 Paragon reputation increments to claim Paragon caches from the quartermaster."
          : 'Visit the faction quartermaster (click "📌 Map Pin" on the card) and buy the mount.',
      ],
    };
  }

  // 11. Raids
  if (fullCtx.includes("raid")) {
    return {
      category: "raid",
      noRepRequired: true,
      isOneTime: false,
      trialCompatible: false,
      timeMinutes: 20,
      difficulty: "3/5 (Рейдовый босс — 1 попытка в неделю на персонажа)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      zoneEn: `${catName} — ${subcatName}`,
      requirementsRu: `Подписка (Вход в рейд) • Босс рейда «${
        subcatName || catName
      }» • КД: 1 раз в неделю на каждого персонажа (шанс ~1–2%)`,
      requirementsEn: `Subscription (Raid Entry) • Raid Boss in "${
        subcatName || catName
      }" • Weekly lockout per character (~1–2% drop chance)`,
      summary: `Редкая добыча с босса рейда «${
        subcatName || catName
      }». Старые рейды легко проходятся в одиночку за 10–15 минут каждым персонажем аккаунта раз в неделю.`,
      summaryEn: `Rare boss drop in the "${
        subcatName || catName
      }" raid. Legacy raids can be easily soloed in 10–15 minutes per character each week.`,
      steps: [
        `Перед входом в рейд «${
          subcatName || catName
        }» проверь нужную сложность в меню портрета персонажа (обычно Героический 25 или Эпохальный).`,
        `Победи босса рейда (можно заходить несколькими персонажами в неделю для умножения шанса).`,
      ],
      stepsEn: [
        `Before entering "${
          subcatName || catName
        }", set the required Raid Difficulty via your character portrait (usually 25-player Heroic or Mythic).`,
        `Defeat the boss (run on multiple alts each week to multiply your drop chances).`,
      ],
    };
  }

  // 12. Dungeons
  if (fullCtx.includes("dungeon")) {
    return {
      category: "dungeon",
      noRepRequired: true,
      isOneTime: false,
      trialCompatible: !requiresSub,
      timeMinutes: 12,
      difficulty: "2/5 (Подземелье — быстрый соло-фарм)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      zoneEn: `${catName} — ${subcatName}`,
      requirementsRu: `${
        requiresSub
          ? "Подписка (Эпохальный режим)"
          : "Доступно на Триале (Героический/Обычный)"
      } • Босс подземелья «${subcatName || catName}» • Шанс ~1–3%`,
      requirementsEn: `${
        requiresSub
          ? "Subscription (Mythic Mode)"
          : "Trial Compatible (Normal/Heroic)"
      } • Dungeon Boss in "${subcatName || catName}" • ~1–3% drop chance`,
      summary: `Выпадает с босса подземелья «${
        subcatName || catName
      }». Занимает 5–10 минут при прохождении в одиночку.`,
      summaryEn: `Drops from a boss inside the "${
        subcatName || catName
      }" dungeon. Takes 5–10 minutes to solo.`,
      steps: [
        `Выстави нужную сложность подземелья (Героический или Эпохальный) и зайди во вход «${
          subcatName || catName
        }».`,
        `Победи босса, с которого падает «${
          nameRu || nameEn
        }», и забери добычу.`,
      ],
      stepsEn: [
        `Set the required Dungeon Difficulty (Heroic or Mythic) and enter "${
          subcatName || catName
        }".`,
        `Defeat the boss that drops "${nameEn}" and loot the mount.`,
      ],
    };
  }

  // 13. PvP (Gladiator / Vicious Saddle / Honor)
  if (
    fullCtx.includes("pvp") ||
    fullCtx.includes("gladiator") ||
    fullCtx.includes("vicious") ||
    fullCtx.includes("prestigious")
  ) {
    const isGladiator = fullCtx.includes("gladiator");
    const isVicious = fullCtx.includes("vicious");
    const isPrestigious = fullCtx.includes("prestigious");
    return {
      category: "pvp",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: !isGladiator && !isVicious,
      timeMinutes: 90,
      difficulty: isGladiator
        ? "5/5 (Гладиатор 2400+ рейтинга арены 3x3)"
        : isVicious
        ? "3/5 (1 Седло ярости за рейтинговое PvP)"
        : isPrestigious
        ? "3/5 (Уровень чести аккаунта)"
        : "2/5 (Почетные знаки PvP)",
      faction: "Both",
      zone: `PvP (${subcatName || "Оргриммар / Штормград"})`,
      zoneEn: `PvP (${subcatName || "Orgrimmar / Stormwind"})`,
      requirementsRu: isGladiator
        ? "Рейтинговая Арена 3x3: 50 побед на рейтинге 2400+ (Гладиатор сезона)"
        : isVicious
        ? "Подписка • 1 Седло ярости (Vicious Saddle) за шкалу побед на рейтинговой арене / Соло-суматохе (1000+ рейтинга)"
        : isPrestigious
        ? "Общий уровень чести (Honor Level) на аккаунте за участие в PvP"
        : "Валюта: 15–100 Почетных знаков (Marks of Honor) за поля боя",
      requirementsEn: isGladiator
        ? "Rated 3v3 Arena: 50 wins above 2400 rating (Season Gladiator)"
        : isVicious
        ? "Subscription • 1 Vicious Saddle from Rated Arena / Solo Shuffle / RBG season progress bar (1000+ rating)"
        : isPrestigious
        ? "Account-wide Honor Level milestone reward from PvP"
        : "Currency: 15–100 Marks of Honor from Battlegrounds",
      summary: isGladiator
        ? "Эксклюзивная сезонная награда за достижение звания «Гладиатор» в рейтинговой арене 3x3."
        : isVicious
        ? "Покупается за 1 «Седло ярости» у Смертостража Незримого в Оргриммаре (/way #85 41.8 73.0) или некроманта Косточка в Штормграде (/way #84 76.8 65.4)."
        : isPrestigious
        ? "Выдается автоматически на весь аккаунт за повышение общего Уровня чести в PvP."
        : "Покупается у интенданта PvP в Зале Легенд (Оргриммар) или Палате Защитников (Штормград) за Почетные знаки.",
      summaryEn: isGladiator
        ? "Exclusive seasonal reward for achieving Gladiator rank in Rated 3v3 Arena."
        : isVicious
        ? "Purchased for 1 Vicious Saddle from Deathguard Netharian in Orgrimmar (/way #85 41.8 73.0) or Necrolord Sipe in Stormwind (/way #84 76.8 65.4)."
        : isPrestigious
        ? "Granted automatically account-wide upon reaching the required Honor Level in PvP."
        : "Purchased from the PvP quartermaster in the Hall of Legends (Orgrimmar) or Champions' Hall (Stormwind) for Marks of Honor.",
      steps: [
        isVicious
          ? "Заполни сезонную шкалу рейтингового PvP и получи «Седло ярости»."
          : "Участвуй в полях боя и потасовках для накопления чести и Почетных знаков.",
        isVicious
          ? "Обменяй Седло ярости у продавца яростных маунтов в Оргриммаре или Штормграде."
          : "Забери маунта у интенданта PvP столицы (нажми «📌 Булавка»).",
      ],
      stepsEn: [
        isVicious
          ? "Fill the seasonal Rated PvP progress bar (above 1000 rating) to earn a Vicious Saddle."
          : "Participate in Battlegrounds and PvP Brawls to earn Honor and Marks of Honor.",
        isVicious
          ? "Exchange the Vicious Saddle at the Vicious Combat Mount vendor in Orgrimmar or Stormwind."
          : 'Purchase the mount from your capital PvP vendor (click "📌 Map Pin").',
      ],
    };
  }

  // 14. Achievements / Glory of the Raider / Hero
  if (fullCtx.includes("achievement") || fullCtx.includes("glory of")) {
    const isGlory = fullCtx.includes("glory of");
    return {
      category: "achievement",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: false,
      timeMinutes: 60,
      difficulty: isGlory
        ? "2/5 (Мета-достижение «Слава рейдеру/герою» — делается за 1 заход!)"
        : "3/5 (Награда за достижение)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      zoneEn: `${catName} — ${subcatName}`,
      requirementsRu: `Достижение «${
        subcatName || catName
      }» • 100% гарантированная награда на почту или в журнал сразу после выполнения`,
      requirementsEn: `Achievement "${
        subcatName || catName
      }" • 100% guaranteed reward delivered via mail or Mount Journal upon completion`,
      summary: isGlory
        ? `100% гарантированный маунт за закрытие мета-достижения «Слава рейдеру / герою» (${catName}). Большинство старых «Слав» закрываются в одиночку за 30–50 минут!`
        : `Гарантированная награда за выполнение достижения в разделе «${catName} — ${subcatName}».`,
      summaryEn: isGlory
        ? `100% guaranteed mount for completing the "${
            subcatName || "Glory of the Raider / Hero"
          }" meta-achievement (${catName}). Most legacy Glory achievements can be soloed in 30–50 minutes!`
        : `Guaranteed reward for completing the achievement in "${catName} — ${subcatName}".`,
      steps: [
        `Открой окно достижений (Y) → найди мета-достижение (${
          subcatName || catName
        }) и отследи его критерии.`,
        `Выполни условия на боссах — маунт сразу придет на внутриигровую почту или добавится в коллекцию.`,
      ],
      stepsEn: [
        `Open the Achievements window (Y) → search for "${
          subcatName || catName
        }" and track its sub-achievements.`,
        `Complete the boss mechanics — the mount is immediately awarded to your collection or in-game mailbox.`,
      ],
    };
  }

  // 15. Professions (Engineering, Tailoring, Jewelcrafting, Blacksmithing, Leatherworking, Fishing)
  if (
    fullCtx.includes("profession") ||
    fullCtx.includes("engineering") ||
    fullCtx.includes("tailoring") ||
    fullCtx.includes("jewelcrafting") ||
    fullCtx.includes("leatherworking") ||
    fullCtx.includes("blacksmithing") ||
    fullCtx.includes("alchemy") ||
    fullCtx.includes("fishing")
  ) {
    const isFishing = fullCtx.includes("fishing");
    return {
      category: "catalog",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: true,
      timeMinutes: 25,
      difficulty: isFishing
        ? "2/5 (Рыбная ловля)"
        : "1/5 (Крафт профессией ИЛИ покупка на Аукционе!)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      zoneEn: `${catName} — ${subcatName}`,
      requirementsRu: isFishing
        ? `Профессия: Рыбная ловля (1+ навык) • Вылавливается из косяков рыбы или водоемов (${catName})`
        : `Ремесло (${subcatName}) ИЛИ прямая покупка готового маунта на Аукционе (большинство крафтовых маунтов — BOE!)`,
      requirementsEn: isFishing
        ? `Profession: Fishing (1+ skill) • Fished from pools or open water (${catName})`
        : `Crafting (${subcatName}) OR direct purchase from the Auction House (most crafted mounts are BoE!)`,
      summary: isFishing
        ? `Добывается с помощью Рыбной ловли в водоемах дополнения ${catName}.`
        : `Создается ремесленной профессией (${subcatName}). Большинство ремесленных маунтов не привязаны при создании и могут быть сразу куплены на Аукционе (или заказаны через Стол заказов).`,
      summaryEn: isFishing
        ? `Obtained via Fishing in ${catName} waters.`
        : `Crafted via ${subcatName}. Most crafted mounts are Bind-on-Equip (BoE) and can be bought directly on the Auction House or via Crafting Orders.`,
      steps: [
        isFishing
          ? `Обучись Рыбной ловле и закидывай удочку в косяки рыбы в локациях ${catName}.`
          : `Проверь цену «${
              nameRu || nameEn
            }» на Аукционе столицы либо собери реагенты рецепта (${subcatName}).`,
        `Изучи предмет в сумке для добавления в коллекцию (некоторые ковры-самолеты и ветролеты требуют навык профессии для призыва).`,
      ],
      stepsEn: [
        isFishing
          ? `Learn Fishing and cast into fishing pools across ${catName} zones.`
          : `Check the price of "${nameEn}" on the Auction House or gather the crafting reagents (${subcatName}).`,
        `Learn the item from your bags to add it to your collection.`,
      ],
    };
  }

  // 16. Rare Spawns / World Bosses / Zones
  if (
    fullCtx.includes("rare") ||
    fullCtx.includes("world boss") ||
    fullCtx.includes("zone")
  ) {
    return {
      category: "rare100",
      noRepRequired: true,
      isOneTime: false,
      trialCompatible: !requiresSub,
      timeMinutes: 15,
      difficulty: "2/5 (Редкий элитный моб / Мировой босс в открытом мире)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      zoneEn: `${catName} — ${subcatName}`,
      requirementsRu: `Открытый мир (${catName} — ${subcatName}) • 0 репутации • Дроп с редкого моба или мирового босса зоны`,
      requirementsEn: `Open World (${catName} — ${subcatName}) • 0 Reputation • Drops from rare elite or zone world boss`,
      summary: `Добывается с редкого монстра или мирового босса в открытом мире (${catName} — ${subcatName}). Нажми «📌 Булавка» на карточке, чтобы поставить метку локации на карту.`,
      summaryEn: `Drops from a rare spawn or world boss in ${catName} (${subcatName}). Click "📌 Map Pin" on the card to set an in-game waypoint.`,
      steps: [
        `Прилети в зону (${catName} — ${subcatName}) по булавке на карте и используй аддон RareScanner / SilverDragon.`,
        `Победи редкого монстра и забери добычу (большинство рарников можно проверять каждый день).`,
      ],
      stepsEn: [
        `Travel to the zone (${catName} — ${subcatName}) using the map pin and use RareScanner / SilverDragon.`,
        `Defeat the rare elite and loot the mount (most rares have a daily loot lockout per character).`,
      ],
    };
  }

  // 17. World Events / Holidays (Brewfest, Hallow's End, Love is in the Air, Winter Veil, Darkmoon)
  if (
    fullCtx.includes("event") ||
    fullCtx.includes("holiday") ||
    fullCtx.includes("brewfest") ||
    fullCtx.includes("hallow") ||
    fullCtx.includes("love is") ||
    fullCtx.includes("noblegarden") ||
    fullCtx.includes("winter veil") ||
    fullCtx.includes("darkmoon")
  ) {
    const isDarkmoon = fullCtx.includes("darkmoon");
    return {
      category: "catalog",
      noRepRequired: true,
      isOneTime: isDarkmoon,
      trialCompatible: true,
      timeMinutes: 20,
      difficulty: isDarkmoon
        ? "2/5 (Ярмарка Новолуния — 180 купонов)"
        : "2/5 (Сезонный мировой праздник)",
      faction: "Both",
      zone: `Праздник / Событие (${subcatName || catName})`,
      zoneEn: `World Event / Holiday (${subcatName || catName})`,
      requirementsRu: isDarkmoon
        ? "Ярмарка Новолуния (открыта с 1-го воскресенья каждого месяца) • Валюта: 180 Призовых купонов Новолуния"
        : `Активный игровой праздник (${
            subcatName || catName
          }) • Ежедневная коробка праздника или валюта ивента`,
      requirementsEn: isDarkmoon
        ? "Darkmoon Faire (open for 1 week starting the first Sunday of each month) • Cost: 180 Darkmoon Prize Tickets"
        : `Active World Event (${
            subcatName || catName
          }) • Daily holiday boss reward box or event currency`,
      summary: isDarkmoon
        ? "Покупается у Лхары на Острове Новолуния за 180 Призовых купонов ярмарки Новолуния."
        : `Добывается во время ежегодного игрового праздника «${
            subcatName || catName
          }» (из ежедневной призовой коробки босса праздника или у праздничного торговца).`,
      summaryEn: isDarkmoon
        ? "Purchased from Lhara on Darkmoon Island for 180 Darkmoon Prize Tickets."
        : `Obtained during the annual "${
            subcatName || catName
          }" holiday event (from the daily holiday dungeon boss box or event vendor).`,
      steps: [
        isDarkmoon
          ? "В первую неделю месяца зайди через портал на Ярмарку Новолуния и выполни мини-игры и квесты профессий на купоны."
          : `Во время праздника «${
              subcatName || catName
            }» регистрируйся к праздничному боссу через Поиск группы (I) каждый день.`,
        isDarkmoon
          ? "Купи маунта у Лхары на пристани Ярмарки Новолуния за 180 купонов."
          : "Открой ежедневную призовую коробку (на первую коробку дня аккаунта действует повышенный шанс выпадения!).",
      ],
      stepsEn: [
        isDarkmoon
          ? "During the first week of the month, enter the Darkmoon Faire portal and complete daily games and profession quests for tickets."
          : `During "${
              subcatName || catName
            }", queue for the holiday boss daily via Group Finder (I).`,
        isDarkmoon
          ? "Purchase the mount from Lhara at the Darkmoon boardwalk for 180 tickets."
          : "Open the daily reward box (your first box of the day per account has a significantly boosted drop rate!).",
      ],
    };
  }

  // 18. Default Catalog Fallback with Rich Contextual Instructions
  return {
    category: "catalog",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: !requiresSub,
    timeMinutes: 20,
    difficulty: `2/5 (${subcatName || catName})`,
    faction: "Both",
    zone: `${catName}${subcatName ? ` • ${subcatName}` : ""}`,
    zoneEn: `${catName}${subcatName ? ` • ${subcatName}` : ""}`,
    requirementsRu: `${
      requiresSub ? "Подписка" : "Доступно всем (10+ ур.)"
    } • Раздел: ${catName} → ${subcatName || "Коллекция"}`,
    requirementsEn: `${
      requiresSub ? "Subscription Required" : "Available to All (Lv 10+)"
    } • Source: ${catName} → ${subcatName || "Collection"}`,
    summary: `Добывается в контенте дополнения «${catName}» (источник по базе Wowhead: ${
      subcatName || "Задания и исследования зоны"
    }).`,
    summaryEn: `Obtained in ${catName} content (Wowhead source: ${
      subcatName || "Quests & Exploration"
    }).`,
    steps: [
      `Поставь булавку на карту кнопкой «📌 Булавка» и отправляйся в локацию (${catName} — ${subcatName}).`,
      `Выполни условие источника «${
        subcatName || catName
      }» (проверь точного НПС или предмет по кнопке «Wowhead» внизу карточки).`,
    ],
    stepsEn: [
      `Set a map pin using "📌 Map Pin" and travel to the location (${catName} — ${subcatName}).`,
      `Complete the "${
        subcatName || catName
      }" objective (click "Wowhead" below for exact NPC/item details).`,
    ],
  };
}

// Helper to parse clean source/requirements lines from live Russian Wowhead tooltip HTML
function parseWowheadRuTooltipHtml(tooltipHtml) {
  if (!tooltipHtml || typeof tooltipHtml !== "string") return "";
  const text = tooltipHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>|<\/div>|<\/p>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ");

  const matchedParts = [];
  const patterns = [
    /(?:Источник|Source)\s*:\s*([^.\n]+)/i,
    /(?:Зона|Zone)\s*:\s*([^.\n]+)/i,
    /(?:Продавец|Vendor)\s*:\s*([^.\n]+)/i,
    /(?:Задание|Quest)\s*:\s*([^.\n]+)/i,
    /(?:Достижение|Achievement)\s*:\s*([^.\n]+)/i,
    /(?:Требуется|Requires)\s+([^.\n]+)/i,
    /(?:Стоимость|Cost)\s*:\s*([^.\n]+)/i,
  ];

  patterns.forEach((rx) => {
    const m = text.match(rx);
    if (m && m[0]) {
      const clean = m[0].trim();
      if (
        clean.length > 4 &&
        clean.length < 130 &&
        !matchedParts.includes(clean)
      ) {
        matchedParts.push(clean);
      }
    }
  });

  return matchedParts.slice(0, 3).join(" • ");
}

// Curated Core Solo Mounts with step-by-step instructions and /way coordinates
const OFFLINE_VERIFIED_REAL_MOUNTS = [
  {
    id: "sl-wildseed-cradle",
    mountId: 1428,
    spellId: 334352,
    itemId: 180731,
    nameRu: "Колыбель дикого семени",
    nameEn: "Wildseed Cradle",
    expansion: "Shadowlands",
    zone: "Арденвельд",
    category: "treasure",
    timeMinutes: 6,
    difficulty: "1/5 (0 репы, без боя)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_ardenwealdseedmount",
    waypoint: "/way #1565 40.3 52.6 Луноцвет (Tirna Vaal)",
    summary:
      "Собрать 5 инструментов садовника в Тирна Ваал и отнести Твинклстару — 100% без боя и репутации.",
    steps: [
      "Прилети в Сад Ночи в Арденвельде (/way #1565 39.7 54.4) и собери Дневник, Молот, Флейту, Жезл и Сеть в радиусе 50 метров.",
      "Объедини 5 предметов в инвентаре и сдай их НПС Луноцвету (/way #1565 40.3 52.6) — рядом появится сундук с маунтом.",
    ],
  },
  {
    id: "sl-shimmermist-runner",
    mountId: 1426,
    spellId: 334365,
    itemId: 180727,
    nameRu: "Мерцающий туманный бегун",
    nameEn: "Shimmermist Runner",
    expansion: "Shadowlands",
    zone: "Арденвельд",
    category: "puzzle",
    timeMinutes: 8,
    difficulty: "1/5 (Лабиринт с синими фонарями)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_ardenwealdstagmount_white",
    waypoint: "/way #1565 31.0 54.4 Вход в Туманную чащу",
    summary:
      "Пройти по развилкам с синими фонарями в Туманной чаще и победить 1 редкого моба со 100% дропом.",
    steps: [
      "Войди в лабиринт Туманной чащи (/way #1565 31.0 54.4) и на каждой развилке иди в проход с синими фонарями.",
      "На поляне убей редкого моба Измазанный валежник (/way #1565 26.3 59.0) и погладь бегуна.",
    ],
  },
  {
    id: "sl-silverwind-larion",
    mountId: 1429,
    spellId: 334366,
    itemId: 180729,
    nameRu: "Сереброкрылый ларион",
    nameEn: "Silverwind Larion",
    expansion: "Shadowlands",
    zone: "Бастион",
    category: "treasure",
    timeMinutes: 20,
    difficulty: "2/5 (Сбор 50 осколков анимы по координатам)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_bastionwingedlionmount_white",
    waypoint: "/way #1533 59.3 39.1 Серебряный колокол (Бастион)",
    summary:
      "Собрать 50 кристальных осколков анимы в Бастионе (без репутации и ковенанта) и открыть сундук.",
    steps: [
      "Собери 50 Кристальных осколков анимы в локации Бастион по координатам Handynotes.",
      "Сдай осколки кузнецу Хephесу и ударь в Серебряный колокол (/way #1533 59.3 39.1), чтобы забрать лариона.",
    ],
  },
  {
    id: "sl-swift-gloomhoof",
    mountId: 1430,
    spellId: 334364,
    itemId: 180728,
    nameRu: "Стремительный мрачнокопыт",
    nameEn: "Swift Gloomhoof",
    expansion: "Shadowlands",
    zone: "Арденвельд",
    category: "rare100",
    timeMinutes: 10,
    difficulty: "2/5 (100% дроп с Кошмарной кобылы)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_ardenwealdstagmount_dark",
    waypoint: "/way #1565 58.6 26.8 Хижина в Тирна Скитт",
    summary:
      "Взять Ловец снов в Арденвельде и убить Кошмарную кобылу в мире теней (100% дроп).",
    steps: [
      "Собери компоненты Сломанного ловца снов (/way #1565 58.6 26.8) и почини его у Иセラ/Души леса.",
      "Используй Ловец снов в долине Тирна Скитт (/way #1565 62.6 36.8) и убей Кошмарную кобылу.",
    ],
  },
  {
    id: "sl-spinemaw-gladechewer",
    mountId: 1362,
    spellId: 334367,
    itemId: 180725,
    nameRu: "Иглобрюхий лесожов",
    nameEn: "Spinemaw Gladechewer",
    expansion: "Shadowlands",
    zone: "Арденвельд",
    category: "rare100",
    timeMinutes: 7,
    difficulty: "1/5 (100% дроп с Горма-укротителя)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_ardenwealdbuggormmount_blue",
    waypoint: "/way #1565 27.6 51.8 Горм-укротитель Тизо",
    summary:
      "Победить Тизо в Туманной чаще Арденвельда — 100% шанс выпадения маунта.",
    steps: [
      "Найди Тизо в Арденвельде (/way #1565 27.6 51.8), сбей его с питомца Чомпи и добей обоих.",
    ],
  },
  {
    id: "sl-arboreal-gulper",
    mountId: 1442,
    spellId: 344228,
    itemId: 182650,
    nameRu: "Древесный заглот",
    nameEn: "Arboreal Gulper",
    expansion: "Shadowlands",
    zone: "Арденвельд",
    category: "rare100",
    timeMinutes: 10,
    difficulty: "1/5 (100% дроп с Юмон’гозза)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_frogardenwealdmount_blue",
    waypoint: "/way #1565 32.4 30.2 Почва для гриба Юмон’гозза",
    summary:
      "Выбить Необычайно большой гриб с мобов в Арденвельде и посадить его в почву (100% дроп).",
    steps: [
      "Убивай мобов в северном Арденвельде до получения Необычайно большого гриба (5–10 минут).",
      "Посади гриб в сырую землю (/way #1565 32.4 30.2) и убей появившегося Юмон’гозза.",
    ],
  },
  {
    id: "sl-sinrunner-blanchy",
    mountId: 1413,
    spellId: 339588,
    itemId: 182614,
    nameRu: "Мертвая Бланш",
    nameEn: "Sinrunner Blanchy",
    expansion: "Shadowlands",
    zone: "Ревендрет",
    category: "quest",
    timeMinutes: 25,
    difficulty: "2/5 (6 быстрых подходов без репы)",
    isOneTime: false,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_horse2bastion_red",
    waypoint: "/way #1525 63.2 43.0 Река у Старых врат",
    summary:
      "Принести Бланш овес, щетку, подковы, воду, попону и яблоки в Ревендрете (0 репутации).",
    steps: [
      "Собери заранее 8 горстей овса в Западном Крае, ведро воды, 4 подковы и 3 яблока в Ревендрете.",
      "Встань на пути пробега Бланш (/way #1525 63.2 43.0) и сдавай по 1 предмету в день.",
    ],
  },
  {
    id: "sl-slime-serpent",
    mountId: 1379,
    spellId: 346141,
    itemId: 184167,
    nameRu: "Слизнюк Чумы",
    nameEn: "Slime Serpent",
    expansion: "Shadowlands",
    zone: "Малдраксус (Чумные каскады)",
    category: "dungeon100",
    timeMinutes: 12,
    difficulty: "2/5 (100% за соло-прохождение)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_serpentmount_green",
    waypoint: "/way #1536 59.3 64.8 Вход в Чумные каскады",
    summary:
      "Пройти подземелье «Чумные каскады» (Героический/Эпохальный) в одиночку и погладить змея.",
    steps: [
      "Войди в подземелье Чумные каскады в режиме Героический или Эпохальный в одиночку.",
      "Победи всех 4 боссов, вернись к площадке 3-го босса Доминуса и погладь Любопытного слизнюка.",
    ],
  },
  {
    id: "wod-great-greytusk",
    mountId: 618,
    spellId: 171629,
    itemId: 116667,
    nameRu: "Большой серый секач",
    nameEn: "Great Greytusk",
    expansion: "Warlords of Draenor",
    zone: "Хребет Ледяного Огня",
    category: "rare100",
    timeMinutes: 5,
    difficulty: "1/5 (100% дроп с Горрока)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_boarmount_white",
    waypoint: "/way #525 58.2 19.0 Горрок (Хребет Ледяного Огня)",
    summary:
      "Убить редкого вепря Горрока на Хребте Ледяного Огня — 100% дроп всем участникам боя.",
    steps: [
      "Проверь 5 точек респауна Горрока на Хребте Ледяного Огня (/way #525 58.2 19.0, 63.4 80.2, 51.8 50.6).",
    ],
  },
  {
    id: "wod-swift-breezestrider",
    mountId: 640,
    spellId: 171832,
    itemId: 116773,
    nameRu: "Стремительный ветробег",
    nameEn: "Swift Breezestrider",
    expansion: "Warlords of Draenor",
    zone: "Долина Призрачной Луны (Дренор)",
    category: "rare100",
    timeMinutes: 6,
    difficulty: "1/5 (100% дроп с Бегущего по тропам)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_talbukdraenor_white",
    waypoint: "/way #539 45.8 68.2 Бегущий по тропам",
    summary:
      "100% дроп с редкого талбука Бегущий по тропам в Долине Призрачной Луны Дренора.",
    steps: [
      "Облети 6 точек в Долине Призрачной Луны (/way #539 45.8 68.2, 54.0 30.6, 43.0 32.0).",
    ],
  },
  {
    id: "wod-mottled-meadowstomper",
    mountId: 627,
    spellId: 171622,
    itemId: 116659,
    nameRu: "Пятнистый лугоступ",
    nameEn: "Mottled Meadowstomper",
    expansion: "Warlords of Draenor",
    zone: "Награнд (Дренор)",
    category: "rare100",
    timeMinutes: 5,
    difficulty: "1/5 (100% дроп с Лук’хока)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_elekkdraenor_blue",
    waypoint: "/way #550 76.0 30.6 Лук’хок (Награнд)",
    summary: "100% дроп с редкого элекка Лук’хока в Награнде Дренора.",
    steps: [
      "Облети точки респауна Лук’хока в Награнде (/way #550 76.0 30.6, 66.8 44.0, 84.4 63.6).",
    ],
  },
  {
    id: "wod-bloodhoof-bull",
    mountId: 616,
    spellId: 171620,
    itemId: 116656,
    nameRu: "Кровавый копытень",
    nameEn: "Bloodhoof Bull",
    expansion: "Warlords of Draenor",
    zone: "Награнд (Дренор)",
    category: "rare100",
    timeMinutes: 5,
    difficulty: "1/5 (100% дроп с Накка Громовержца)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_clefthoofdraenormount_red",
    waypoint: "/way #550 62.8 15.0 Накк Громовержец",
    summary:
      "100% дроп с редкого копытня Накка Громовержца в северном Награнде.",
    steps: [
      "Проверь северный Награнд (/way #550 62.8 15.0, 50.0 34.4, 55.0 35.4).",
    ],
  },
  {
    id: "wod-sapphire-riverbeast",
    mountId: 650,
    spellId: 171825,
    itemId: 116768,
    nameRu: "Сапфировое речное чудище",
    nameEn: "Sapphire Riverbeast",
    expansion: "Warlords of Draenor",
    zone: "Таладор",
    category: "rare100",
    timeMinutes: 5,
    difficulty: "1/5 (100% дроп с Сильтхаида)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_hippobeastmount_blue",
    waypoint: "/way #535 62.0 32.4 Сильтхаид (Таладор)",
    summary: "100% дроп с редкого речного чудища Сильтхаида в реках Таладора.",
    steps: [
      "Проверь устья рек в Таладоре (/way #535 62.0 32.4, 79.4 55.2, 54.2 83.2).",
    ],
  },
  {
    id: "wod-sunhide-gronnling",
    mountId: 655,
    spellId: 171849,
    itemId: 116792,
    nameRu: "Солнечношкурый гроннлинг",
    nameEn: "Sunhide Gronnling",
    expansion: "Warlords of Draenor",
    zone: "Горгронд",
    category: "rare100",
    timeMinutes: 6,
    difficulty: "1/5 (100% дроп с Пудокулака)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_lessergronnmount_yellow",
    waypoint: "/way #543 42.0 25.0 Пудокулак (Горгронд)",
    summary: "100% дроп с редкого гронна Пудокулака в Горгронде.",
    steps: [
      "Проверь 5 точек респауна Пудокулака в Горгронде (/way #543 42.0 25.0, 51.4 43.1, 47.0 54.0).",
    ],
  },
  {
    id: "wod-garn-nighthowl",
    mountId: 657,
    spellId: 171851,
    itemId: 116794,
    nameRu: "Гарн Ночной Вой",
    nameEn: "Garn Nighthowl",
    expansion: "Warlords of Draenor",
    zone: "Хребет Ледяного Огня",
    category: "rare100",
    timeMinutes: 4,
    difficulty: "1/5 (100% дроп с Ночного Воя, респаун 15 мин)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_wolfdraenor_black",
    waypoint: "/way #525 16.0 52.2 Пещера Ночного Воя",
    summary:
      "100% дроп с волка Ночной Вой на западе Хребта Ледяного Огня (респаун всего 15–30 минут!).",
    steps: [
      "Прилети к скалам на западе Хребта Ледяного Огня (/way #525 16.0 52.2) и убей волка Ночной Вой.",
    ],
  },
  {
    id: "wotlk-bronze-drake",
    mountId: 248,
    spellId: 59569,
    itemId: 43951,
    nameRu: "Бронзовый дракон",
    nameEn: "Bronze Drake",
    expansion: "Wrath of the Lich King",
    zone: "Танарис (Пещеры Времени)",
    category: "dungeon100",
    timeMinutes: 9,
    difficulty: "1/5 (100% дроп в Очищении Стратхольма Гер.)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "ability_mount_drake_bronze",
    waypoint: "/way #75 56.6 82.8 Очищение Стратхольма (Пещеры Времени)",
    summary:
      "100% дроп с Осквернителя из рода Бесконечности в героическом Очищении Стратхольма (<25 мин).",
    steps: [
      "Включи Героический режим подземелий и зайди в Очищение Стратхольма в Пещерах Времени.",
      "Зачисти волны за ~8 минут и перед финальным боссом сверни налево в переулок к Осквернителю.",
    ],
  },
  {
    id: "wotlk-black-drake",
    mountId: 249,
    spellId: 59650,
    itemId: 43986,
    nameRu: "Черный дракон",
    nameEn: "Black Drake",
    expansion: "Wrath of the Lich King",
    zone: "Драконий Погост (Обсидиановое святилище)",
    category: "dungeon100",
    timeMinutes: 2,
    difficulty: "1/5 (100% дроп за 30 секунд!)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: false,
    faction: "Both",
    icon: "ability_mount_drake_twilight",
    waypoint: "/way #115 60.0 57.0 Храм Драконьего Покоя (Вход снизу)",
    summary:
      "Убить Сартариона в Обсидиановом святилище (10 игроков) сразу по центру, не трогая 3 аддов (100% дроп).",
    steps: [
      "Поставь размер рейда 10 игроков и войди в Обсидиановое святилище под Храмом Драконьего Покоя.",
      "Сразу ударь Сартариона по центру (не убивая трех малых драконов по краям) и забери 100% Черного дракона.",
    ],
  },
  {
    id: "wotlk-twilight-drake",
    mountId: 250,
    spellId: 59571,
    itemId: 43954,
    nameRu: "Сумеречный дракон",
    nameEn: "Twilight Drake",
    expansion: "Wrath of the Lich King",
    zone: "Драконий Погост (Обсидиановое святилище)",
    category: "dungeon100",
    timeMinutes: 2,
    difficulty: "1/5 (100% дроп в режиме 25 игроков)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: false,
    faction: "Both",
    icon: "ability_mount_drake_twilight",
    waypoint: "/way #115 60.0 57.0 Храм Драконьего Покоя (Вход снизу)",
    summary:
      "Убить Сартариона в Обсидиановом святилище (25 игроков) сразу по центру, не трогая 3 аддов (100% дроп).",
    steps: [
      "Поставь размер рейда 25 игроков, войди в Обсидиановое святилище и убей Сартариона за 5 секунд.",
    ],
  },
  {
    id: "cata-amani-battle-bear",
    mountId: 419,
    spellId: 98204,
    itemId: 69747,
    nameRu: "Боевой медведь Амани",
    nameEn: "Amani Battle Bear",
    expansion: "Cataclysm",
    zone: "Призрачные земли (Зул'Аман)",
    category: "dungeon100",
    timeMinutes: 10,
    difficulty: "1/5 (100% дроп за 4 боссов за 15 минут)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "ability_druid_challangingroar",
    waypoint: "/way #95 81.8 64.3 Вход в подземелье Зул'Аман",
    summary:
      "Победить первых 4 боссов подземелья Зул'Аман до истечения таймера жертвоприношения (100% дроп).",
    steps: [
      "Зайди в подземелье Зул'Аман (Героический), ударь в гонг и убей 4 тотемных боссов подряд.",
      "У 4-го босса разбей урны Каши и забери 100% Боевого медведя Амани из мешка.",
    ],
  },
  {
    id: "cata-vashjir-seahorse",
    mountId: 373,
    spellId: 75207,
    itemId: 54465,
    nameRu: "Морской конек Вайш'ира",
    nameEn: "Vashj'ir Seahorse",
    expansion: "Cataclysm",
    zone: "Вайш'ир (Лес Келп'тар)",
    category: "quest",
    timeMinutes: 12,
    difficulty: "1/5 (100% за стартовую цепочку)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "ability_mount_seahorse",
    waypoint: "/way #201 55.2 72.4 Эрунак Говорящий с Камнем",
    summary:
      "Выполнить первые 10 быстрых заданий в Вайш'ире до квеста «Приманка для бездны» (100% награда).",
    steps: [
      "Возьми стартовый квест в Вайш'ир с Доски объявлений в Оргриммаре или Штормграде.",
      "Дойди до задания «Приманка для бездны» у Моанны и поймай морского конька на веревку.",
    ],
  },
  {
    id: "mop-red-flying-cloud",
    mountId: 522,
    spellId: 130092,
    itemId: 89363,
    nameRu: "Диск красного парящего облака",
    nameEn: "Red Flying Cloud",
    expansion: "Mists of Pandaria",
    zone: "Вечноцветущий дол",
    category: "treasure",
    timeMinutes: 25,
    difficulty: "1/5 (Облет свитков Пандарии, 0 боев!)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_pandarenserpentmount_lightning_red",
    waypoint: "/way #390 82.2 29.4 Таоши (Дворец Могу’шан)",
    summary:
      "Прочитать свитки истории на вершинах Пандарии (прокачивает Хранителей истории с 0 до Превознесения за 25 минут!).",
    steps: [
      "Пролети по точкам свитков в Пандарии (достижения «Баллада о Лю Лан», «Сердце роя», «Между сауроком и наковальней»).",
      "Прочитай письма на почте и купи Диск красного парящего облака у Тани Ши Твердой Лапы во Дворце Могу’шан.",
    ],
  },
  {
    id: "legion-riddlers-mind-worm",
    mountId: 947,
    spellId: 243025,
    itemId: 147835,
    nameRu: "Загадочный червь разума",
    nameEn: "Riddler's Mind-Worm",
    expansion: "Legion",
    zone: "Западный Край (финал)",
    category: "puzzle",
    timeMinutes: 35,
    difficulty: "2/5 (Прочитать 8 страниц по координатам)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_serpentmount_purple",
    waypoint: "/way #52 30.5 28.0 Подарок Искателей Разума (Западный Край)",
    summary:
      "Прочитать по порядку 8 страниц секретной головоломки и открыть сундук на берегу Западного Края.",
    steps: [
      "Прочитай страницы №9, №78, №161, №655, №845, №1127, №2051 и №5555 строго по очереди.",
      "Открой сундук «Подарок Искателей Разума» на берегу Западного Края (/way #52 30.5 28.0).",
    ],
  },
  {
    id: "legion-lucid-nightmare",
    mountId: 961,
    spellId: 247402,
    itemId: 151623,
    nameRu: "Осознанный кошмар",
    nameEn: "Lucid Nightmare",
    expansion: "Legion",
    zone: "Перевал Мертвого Ветра (Склеп Каражана)",
    category: "puzzle",
    timeMinutes: 60,
    difficulty: "3/5 (Секретная цепочка + лабиринт)",
    isOneTime: true,
    noRepRequired: true,
    trialCompatible: true,
    faction: "Both",
    icon: "inv_horse2purple",
    waypoint: "/way #42 39.8 73.6 Забытый склеп рядом с Каражаном",
    summary:
      "Секретный единорог Бездны за решение головоломок и Бесконечных залов.",
    steps: [
      "Пройди 7 коротких записок от Даларана до Вершины Кунь-Лай.",
      "Собери 5 сфер в Бесконечных залах и забери Осознанного кошмара в склепе у Каражана.",
    ],
  },
];

function getVerifiedDataForAzerothRarity(
  mountId,
  nameEn,
  nameRu,
  liveDfaMap,
  customDfaMap
) {
  const normEn = normalizeMountEnKey(nameEn);

  if (customDfaMap && normEn && customDfaMap[normEn] !== undefined) {
    const val = customDfaMap[normEn];
    return {
      pct: val,
      display: val < 1 && val > 0 ? "<1%" : `${Math.round(val)}%`,
      verified: true,
    };
  }

  if (normEn && DFA_NORMALIZED_MAP[normEn]) {
    return {
      pct: DFA_NORMALIZED_MAP[normEn].pct,
      display: DFA_NORMALIZED_MAP[normEn].display,
      verified: true,
    };
  }

  if (liveDfaMap && mountId && liveDfaMap[mountId] !== undefined) {
    const val = Number(liveDfaMap[mountId]);
    return {
      pct: val,
      display: val < 1 && val > 0 ? "<1%" : `${Math.round(val)}%`,
      verified: true,
    };
  }

  return {
    pct: 18,
    display: "~18%",
    verified: false,
  };
}

function classifyCatalogMountSource(rawItem, catName, subcatName) {
  const nameEn = rawItem.name || "";
  const normEn = normalizeMountEnKey(nameEn);
  const fullCtx = `${catName} ${subcatName} ${nameEn}`.toLowerCase();

  // Check if content requires Subscription / High Level (Raids, Endgame Mythic/Gladiator/TWW/DF Endgame)
  const requiresSub =
    fullCtx.includes("raid") ||
    fullCtx.includes("gladiator") ||
    fullCtx.includes("vicious") ||
    fullCtx.includes("mythic") ||
    fullCtx.includes("keystone") ||
    fullCtx.includes("glory of the") ||
    fullCtx.includes("brawler") ||
    fullCtx.includes("mage tower") ||
    fullCtx.includes("torghast") ||
    fullCtx.includes("protoform");

  if (STRICT_RACIAL_VENDOR_WHITELIST.has(normEn)) {
    const isAlliance =
      fullCtx.includes("horse") ||
      fullCtx.includes("steed") ||
      fullCtx.includes("ram") ||
      fullCtx.includes("saber") ||
      fullCtx.includes("mechanostrider") ||
      fullCtx.includes("elekk") ||
      fullCtx.includes("gryphon");
    return {
      category: "vendor",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: true,
      timeMinutes: 2,
      difficulty: "1/5 (Базовый расовый торговец столицы за 1–10 золотых)",
      faction: isAlliance ? "Alliance" : "Horde",
      zone: isAlliance
        ? "Штормград / Стальгорн / Дарнас"
        : "Оргриммар / Луносвет / Подгород",
      summary:
        "Покупается напрямую у расового торговца верховыми животными столицы за 1–10 золотых.",
    };
  }

  if (
    fullCtx.includes("reputation") ||
    fullCtx.includes("renown") ||
    fullCtx.includes("paragon")
  ) {
    return {
      category: "reputation",
      noRepRequired: false,
      isOneTime: false,
      trialCompatible: !requiresSub,
      timeMinutes: 180,
      difficulty: "3/5 (Требуется Превознесение / Известность фракции)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      summary: `Требуется прокачка репутации или известности (${
        subcatName || catName
      }) по данным Wowhead.`,
    };
  }

  if (fullCtx.includes("raid")) {
    return {
      category: "raid",
      noRepRequired: true,
      isOneTime: false,
      trialCompatible: false,
      timeMinutes: 20,
      difficulty: "3/5 (Дроп с рейдового босса — 1 попытка в неделю)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      summary: `Выпадает с босса рейда (${
        subcatName || catName
      }). Вход в рейды требует подписки.`,
    };
  }

  if (fullCtx.includes("dungeon")) {
    return {
      category: "dungeon",
      noRepRequired: true,
      isOneTime: false,
      trialCompatible: !requiresSub,
      timeMinutes: 15,
      difficulty: "2/5 (Подземелье — можно фармить в одиночку)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      summary: `Добывается в подземелье (${subcatName || catName}).`,
    };
  }

  if (
    fullCtx.includes("pvp") ||
    fullCtx.includes("gladiator") ||
    fullCtx.includes("vicious")
  ) {
    const isHonorMarks =
      !fullCtx.includes("gladiator") && !fullCtx.includes("vicious");
    return {
      category: "pvp",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: isHonorMarks,
      timeMinutes: 60,
      difficulty: "3/5 (PvP / Почетные знаки / Седло ярости)",
      faction: "Both",
      zone: `PvP — ${subcatName}`,
      summary: `Награда за PvP (${subcatName || catName}).`,
    };
  }

  if (fullCtx.includes("achievement") || fullCtx.includes("glory of")) {
    return {
      category: "achievement",
      noRepRequired: true,
      isOneTime: true,
      trialCompatible: false,
      timeMinutes: 90,
      difficulty: "3/5 (Награда за достижение)",
      faction: "Both",
      zone: `${catName} — ${subcatName}`,
      summary: `Выдается за выполнение достижения (${subcatName || catName}).`,
    };
  }

  return {
    category: "catalog",
    noRepRequired: true,
    isOneTime: true,
    trialCompatible: !requiresSub,
    timeMinutes: 25,
    difficulty: `2/5 (${subcatName || catName})`,
    faction: "Both",
    zone: `${catName}${subcatName ? ` • ${subcatName}` : ""}`,
    summary: `Источник по базе Wowhead / SimpleArmory: ${catName} — ${subcatName}.`,
  };
}

// Specific coordinates for popular mounts, bosses, vendors, dungeons, raids & quartermasters
const EXACT_MOUNT_WAYPOINTS_DB = {
  // Racial Vendors (Horde & Alliance)
  "red hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "blue hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "purple hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "black hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "swift green hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "swift pink hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "swift purple hawkstrider": {
    mapId: 94,
    x: 61.0,
    y: 54.6,
    label: "Винастра (Леса Вечной Песни)",
  },
  "brown wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "dire wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "timber wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "black wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "swift brown wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "swift gray wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "swift timber wolf": {
    mapId: 85,
    x: 61.6,
    y: 35.6,
    label: "Огунаро Волкопас (Оргриммар)",
  },
  "emerald raptor": {
    mapId: 1,
    x: 55.2,
    y: 75.6,
    label: "Зьолнир (Деревня Сен’джин, Дуротар)",
  },
  "turquoise raptor": {
    mapId: 1,
    x: 55.2,
    y: 75.6,
    label: "Зьолнир (Деревня Сен’джин, Дуротар)",
  },
  "violet raptor": {
    mapId: 1,
    x: 55.2,
    y: 75.6,
    label: "Зьолнир (Деревня Сен’джин, Дуротар)",
  },
  "swift blue raptor": {
    mapId: 1,
    x: 55.2,
    y: 75.6,
    label: "Зьолнир (Деревня Сен’джин, Дуротар)",
  },
  "swift olive raptor": {
    mapId: 1,
    x: 55.2,
    y: 75.6,
    label: "Зьолнир (Деревня Сен’джин, Дуротар)",
  },
  "swift orange raptor": {
    mapId: 1,
    x: 55.2,
    y: 75.6,
    label: "Зьолнир (Деревня Сен’джин, Дуротар)",
  },
  "brown kodo": {
    mapId: 7,
    x: 47.6,
    y: 58.0,
    label: "Харб Когтекопыт (Мулгор)",
  },
  "gray kodo": {
    mapId: 7,
    x: 47.6,
    y: 58.0,
    label: "Харб Когтекопыт (Мулгор)",
  },
  "white kodo": {
    mapId: 7,
    x: 47.6,
    y: 58.0,
    label: "Харб Когтекопыт (Мулгор)",
  },
  "great brown kodo": {
    mapId: 7,
    x: 47.6,
    y: 58.0,
    label: "Харб Когтекопыт (Мулгор)",
  },
  "great gray kodo": {
    mapId: 7,
    x: 47.6,
    y: 58.0,
    label: "Харб Когтекопыт (Мулгор)",
  },
  "great white kodo": {
    mapId: 7,
    x: 47.6,
    y: 58.0,
    label: "Харб Когтекопыт (Мулгор)",
  },
  "red skeletal horse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "blue skeletal horse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "brown skeletal horse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "black skeletal horse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "green skeletal warhorse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "purple skeletal warhorse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "ochre skeletal warhorse": {
    mapId: 18,
    x: 61.8,
    y: 51.8,
    label: "Захария Пост (Брилл, Тирисфаль)",
  },
  "goblin trike": {
    mapId: 85,
    x: 36.4,
    y: 86.6,
    label: "Калл Богаттон (Оргриммар)",
  },
  "goblin turbo-trike": {
    mapId: 85,
    x: 36.4,
    y: 86.6,
    label: "Калл Богаттон (Оргриммар)",
  },
  "tawny wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  "blue wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  "green wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  "swift red wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  "swift green wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  "swift yellow wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  "swift purple wind rider": {
    mapId: 85,
    x: 48.2,
    y: 58.6,
    label: "Дракма (Укротитель ветрокрылов, Оргриммар)",
  },
  // Iconic Raid / Dungeon / World Mounts
  "ashes of alar": {
    mapId: 109,
    x: 73.6,
    y: 63.7,
    label: "Кель’тас (Крепость Бурь, Пустоверть)",
  },
  invincible: {
    mapId: 118,
    x: 53.8,
    y: 87.0,
    label: "Король-лич (Цитадель Ледяной Короны)",
  },
  "mimirons head": {
    mapId: 120,
    x: 41.6,
    y: 17.8,
    label: "Йогг-Сарон (Ульдуар, Грозовая Гряда)",
  },
  "raven lord": {
    mapId: 108,
    x: 44.3,
    y: 65.6,
    label: "Анзу (Сетеккские залы, Лес Тероккар)",
  },
  "swift white hawkstrider": {
    mapId: 122,
    x: 61.2,
    y: 30.9,
    label: "Терраса Магистров (Остров Кель’Данас)",
  },
  "rivendares deathcharger": {
    mapId: 23,
    x: 43.4,
    y: 19.4,
    label: "Стратхольм (Восточные Чумные земли)",
  },
  "fiery warhorse": {
    mapId: 42,
    x: 46.9,
    y: 74.8,
    label: "Ловчий Аттумен (Каражан)",
  },
  midnight: {
    mapId: 42,
    x: 46.9,
    y: 74.8,
    label: "Ловчий Аттумен (Возвращение в Каражан)",
  },
  "onyxian drake": {
    mapId: 70,
    x: 52.5,
    y: 76.4,
    label: "Логово Ониксии (Пылевые топи)",
  },
  "azure drake": {
    mapId: 114,
    x: 27.5,
    y: 26.7,
    label: "Малигос (Око Вечности, Борейская тундра)",
  },
  "blue drake": {
    mapId: 114,
    x: 27.5,
    y: 26.7,
    label: "Малигос (Око Вечности, Борейская тундра)",
  },
  "blue proto-drake": {
    mapId: 117,
    x: 57.3,
    y: 46.6,
    label: "Скади Безжалостный (Вершина Утгард)",
  },
  "green proto-drake": {
    mapId: 119,
    x: 54.6,
    y: 56.3,
    label: "Оракулы (Низина Шолазар — Загадочное яйцо)",
  },
  "time-lost proto-drake": {
    mapId: 120,
    x: 31.2,
    y: 69.2,
    label: "Маршрут Затерянного во времени протодракона",
  },
  "phosphorescent stone drake": {
    mapId: 207,
    x: 51.0,
    y: 50.0,
    label: "Эонакс (Подземье, вокруг Храма Земли)",
  },
  "vitreous stone drake": {
    mapId: 207,
    x: 47.6,
    y: 52.0,
    label: "Каменные Недра (Вход в Храме Земли, Подземье)",
  },
  "drake of the north wind": {
    mapId: 249,
    x: 76.6,
    y: 84.4,
    label: "Альтаирий (Вершина Смерча, Ульдум)",
  },
  "drake of the south wind": {
    mapId: 249,
    x: 38.4,
    y: 80.6,
    label: "Ал’акир (Трон Четырех Ветров, Ульдум)",
  },
  "flametalon of alysrazor": {
    mapId: 198,
    x: 47.6,
    y: 78.4,
    label: "Огненные Просторы (Гора Хиджал)",
  },
  "pureblood fire hawk": {
    mapId: 198,
    x: 47.6,
    y: 78.4,
    label: "Рагнарос (Огненные Просторы, Гора Хиджал)",
  },
  "experiment 12-b": {
    mapId: 75,
    x: 61.9,
    y: 26.2,
    label: "Ультраксион (Душа Дракона, Пещеры Времени)",
  },
  "blazing drake": {
    mapId: 75,
    x: 61.9,
    y: 26.2,
    label: "Смертокрыл (Душа Дракона, Пещеры Времени)",
  },
  "life-binders handmaiden": {
    mapId: 75,
    x: 61.9,
    y: 26.2,
    label: "Смертокрыл Гер. (Душа Дракона, Пещеры Времени)",
  },
  "astral cloud serpent": {
    mapId: 379,
    x: 59.6,
    y: 39.2,
    label: "Элегон (Подземелья Могу’шан, Кунь-Лай)",
  },
  "spawn of horridon": {
    mapId: 504,
    x: 63.6,
    y: 32.2,
    label: "Хорридон (Престол Гроз, Остров Грома)",
  },
  "clutch of ji-kun": {
    mapId: 504,
    x: 63.6,
    y: 32.2,
    label: "Цзи-Кунь (Престол Гроз, Остров Грома)",
  },
  "korkron juggernaut": {
    mapId: 390,
    x: 74.0,
    y: 42.0,
    label: "Гаррош (Осада Оргриммара, Вечноцветущий дол)",
  },
  "solar spirehawk": {
    mapId: 542,
    x: 37.0,
    y: 39.2,
    label: "Рухмар (Пики Арака)",
  },
  "ironhoof destroyer": {
    mapId: 543,
    x: 51.5,
    y: 28.6,
    label: "Чернорук (Литейная клана Черной Горы)",
  },
  "felsteel annihilator": {
    mapId: 534,
    x: 45.6,
    y: 53.6,
    label: "Архимонд (Цитадель Адского Пламени)",
  },
  "abyss worm": {
    mapId: 646,
    x: 64.6,
    y: 21.0,
    label: "Госпожа Сашж’ин (Гробница Саргераса)",
  },
  "antoran charhound": {
    mapId: 885,
    x: 54.8,
    y: 62.4,
    label: "Анторус, Пылающий Трон (Пустоши Анторуса)",
  },
  "shackled urzul": {
    mapId: 885,
    x: 54.8,
    y: 62.4,
    label: "Аргус (Анторус, Пылающий Трон)",
  },
  sharkbait: {
    mapId: 895,
    x: 84.4,
    y: 78.8,
    label: "Вольная Гавань (Тирагардское поморье)",
  },
  "underrot crawg": {
    mapId: 863,
    x: 51.4,
    y: 64.8,
    label: "Подгнилье (Назмир)",
  },
  "tomb stalker": {
    mapId: 862,
    x: 39.2,
    y: 71.4,
    label: "Гробница королей (Зулдазар)",
  },
  "mechagon peacekeeper": {
    mapId: 1462,
    x: 73.0,
    y: 36.4,
    label: "Операция «Мехагон» (Остров Мехагон)",
  },
  "aerial unit r-21/x": {
    mapId: 1462,
    x: 73.0,
    y: 36.4,
    label: "Король Мехагон (Операция «Мехагон»)",
  },
  "g m o d": { mapId: 1165, x: 39.0, y: 21.0, label: "Битва за Дазар’алор" },
  "glacial tidestorm": {
    mapId: 1165,
    x: 39.0,
    y: 21.0,
    label: "Джайна Праудмур (Битва за Дазар’алор)",
  },
  "nyalotha allseer": {
    mapId: 1527,
    x: 55.2,
    y: 43.0,
    label: "Н’Зот (Ни’алота, Пробуждающийся Город)",
  },
  marrowfang: {
    mapId: 1533,
    x: 40.2,
    y: 55.2,
    label: "Смертельная тризна (Бастион)",
  },
  "cartel masters gearglider": {
    mapId: 1565,
    x: 48.0,
    y: 50.0,
    label: "Со’лея (Тайный рынок Тазавеш)",
  },
  "sanctum gloomcharger": {
    mapId: 1543,
    x: 69.6,
    y: 32.0,
    label: "Девять (Святилище Господства, Утроба)",
  },
  vengeance: {
    mapId: 1543,
    x: 69.6,
    y: 32.0,
    label: "Сильвана (Святилище Господства, Утроба)",
  },
  "zereth overseer": {
    mapId: 1970,
    x: 80.4,
    y: 53.2,
    label: "Тюремщик (Гробница Предвечных, Зерет Мортис)",
  },
  "anurelos flames guidance": {
    mapId: 2200,
    x: 27.2,
    y: 31.0,
    label: "Фиракк (Амирдрассил, Изумрудный Сон)",
  },
  "ascendant skyrazor": {
    mapId: 2255,
    x: 36.2,
    y: 70.6,
    label: "Королева Ансурек (Неруб’арский дворец, Аз-Кахет)",
  },
  "sureki skyrazor": {
    mapId: 2255,
    x: 36.2,
    y: 70.6,
    label: "Королева Ансурек (Неруб’арский дворец, Аз-Кахет)",
  },
  alunira: { mapId: 2248, x: 24.4, y: 58.2, label: "Алунира (Остров Дорн)" },
  "beledars spawn": {
    mapId: 2215,
    x: 65.4,
    y: 46.2,
    label: "Порождение Беледара (Тайносводье)",
  },
  siesbarg: { mapId: 2255, x: 45.2, y: 16.4, label: "Ткачиха (Аз-Кахет)" },
  "armored brown bear": {
    mapId: 125,
    x: 58.2,
    y: 42.4,
    label: "Мей Франкис (Даларан, Нордскол)",
  },
  "travelers tundra mammoth": {
    mapId: 125,
    x: 58.2,
    y: 42.4,
    label: "Мей Франкис (Даларан, Нордскол)",
  },
  "grand expedition yak": {
    mapId: 379,
    x: 65.4,
    y: 61.8,
    label: "Дядюшка Толстая Сума (Вершина Кунь-Лай)",
  },
  "blonde riding yak": {
    mapId: 379,
    x: 65.4,
    y: 61.8,
    label: "Дядюшка Толстая Сума (Вершина Кунь-Лай)",
  },
  "grey riding yak": {
    mapId: 379,
    x: 65.4,
    y: 61.8,
    label: "Дядюшка Толстая Сума (Вершина Кунь-Лай)",
  },
};

function resolveMountMapPin(mount, catName = "", subcatName = "") {
  const enTitle = mount?.nameEn || "Mount Waypoint";
  // 1. Parse existing waypoint string if present (e.g. "/way #1565 40.3 52.6 Луноцвет")
  const rawWay = String(mount?.waypoint || "").trim();
  const parsedWay = rawWay.match(
    /\/way\s+(?:#(\d+)\s+)?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(.*)/i
  );
  if (parsedWay) {
    const mapId = Number(parsedWay[1]) || 85;
    const x = parseFloat(parsedWay[2]);
    const y = parseFloat(parsedWay[3]);
    const label =
      parsedWay[4]?.trim() || mount.nameRu || mount.nameEn || "Точка маунта";
    const labelEn = enTitle;
    return {
      mapId,
      x,
      y,
      label,
      labelEn,
      tomtomCmd: `/way #${mapId} ${x.toFixed(1)} ${y.toFixed(1)} ${label}`,
      tomtomCmdEn: `/way #${mapId} ${x.toFixed(1)} ${y.toFixed(1)} ${labelEn}`,
      blizzardMacro: `/run C_Map.SetUserWaypoint(UiMapPoint.CreateFromCoordinates(${mapId},${(
        x / 100
      ).toFixed(4)},${(y / 100).toFixed(
        4
      )})) C_SuperTracked.SetSuperTrackedUserWaypoint(true) print("📌 Булавка на карте: ${label.replace(
        /"/g,
        ""
      )}")`,
      blizzardMacroEn: `/run C_Map.SetUserWaypoint(UiMapPoint.CreateFromCoordinates(${mapId},${(
        x / 100
      ).toFixed(4)},${(y / 100).toFixed(
        4
      )})) C_SuperTracked.SetSuperTrackedUserWaypoint(true) print("📌 Map Pin: ${labelEn.replace(
        /"/g,
        ""
      )}")`,
    };
  }

  // 2. Check exact dictionary by normalized English name
  const normEn = normalizeMountEnKey(mount?.nameEn || "");
  if (normEn && EXACT_MOUNT_WAYPOINTS_DB[normEn]) {
    const exact = EXACT_MOUNT_WAYPOINTS_DB[normEn];
    const labelEn = enTitle;
    return {
      mapId: exact.mapId,
      x: exact.x,
      y: exact.y,
      label: exact.label,
      labelEn,
      tomtomCmd: `/way #${exact.mapId} ${exact.x.toFixed(1)} ${exact.y.toFixed(
        1
      )} ${exact.label}`,
      tomtomCmdEn: `/way #${exact.mapId} ${exact.x.toFixed(
        1
      )} ${exact.y.toFixed(1)} ${labelEn}`,
      blizzardMacro: `/run C_Map.SetUserWaypoint(UiMapPoint.CreateFromCoordinates(${
        exact.mapId
      },${(exact.x / 100).toFixed(4)},${(exact.y / 100).toFixed(
        4
      )})) C_SuperTracked.SetSuperTrackedUserWaypoint(true) print("📌 Булавка на карте: ${exact.label.replace(
        /"/g,
        ""
      )}")`,
      blizzardMacroEn: `/run C_Map.SetUserWaypoint(UiMapPoint.CreateFromCoordinates(${
        exact.mapId
      },${(exact.x / 100).toFixed(4)},${(exact.y / 100).toFixed(
        4
      )})) C_SuperTracked.SetSuperTrackedUserWaypoint(true) print("📌 Map Pin: ${labelEn.replace(
        /"/g,
        ""
      )}")`,
    };
  }

  // 3. Smart fallback by expansion / zone / subcategory so EVERY mount gets a real working map pin
  const ctx = `${catName} ${subcatName} ${mount?.expansion || ""} ${
    mount?.zone || ""
  } ${mount?.nameEn || ""}`.toLowerCase();

  let target = {
    mapId: 85,
    x: 48.2,
    y: 76.0,
    label: "Торговая лавка / Столица (Оргриммар)",
    labelEn: "Trading Post / Capital (Orgrimmar)",
  };

  if (
    ctx.includes("ardenweald") ||
    ctx.includes("арденвельд") ||
    ctx.includes("night fae") ||
    ctx.includes("wilderling") ||
    ctx.includes("runestag")
  ) {
    target = {
      mapId: 1565,
      x: 48.4,
      y: 50.4,
      label: "Сердце Леса (Арденвельд)",
      labelEn: "Heart of the Forest (Ardenweald)",
    };
  } else if (
    ctx.includes("bastion") ||
    ctx.includes("бастион") ||
    ctx.includes("kyrian") ||
    ctx.includes("phalynx") ||
    ctx.includes("aquilon") ||
    ctx.includes("larion")
  ) {
    target = {
      mapId: 1533,
      x: 52.2,
      y: 47.0,
      label: "Элизийская цитадель (Бастион)",
      labelEn: "Elysian Hold (Bastion)",
    };
  } else if (
    ctx.includes("maldraxxus") ||
    ctx.includes("малдраксус") ||
    ctx.includes("necrolord") ||
    ctx.includes("tauralus") ||
    ctx.includes("corpsefly")
  ) {
    target = {
      mapId: 1536,
      x: 50.6,
      y: 53.4,
      label: "Престол Примаса (Малдраксус)",
      labelEn: "Seat of the Primus (Maldraxxus)",
    };
  } else if (
    ctx.includes("revendreth") ||
    ctx.includes("ревендрет") ||
    ctx.includes("venthyr") ||
    ctx.includes("gargon") ||
    ctx.includes("gravewing") ||
    ctx.includes("dredwing")
  ) {
    target = {
      mapId: 1525,
      x: 51.2,
      y: 40.2,
      label: "Грехопад (Ревендрет)",
      labelEn: "Sinfall (Revendreth)",
    };
  } else if (
    ctx.includes("zereth") ||
    ctx.includes("зерет") ||
    ctx.includes("protoform")
  ) {
    target = {
      mapId: 1970,
      x: 34.8,
      y: 64.2,
      label: "Приют Пилигрима (Зерет Мортис)",
      labelEn: "Haven (Zereth Mortis)",
    };
  } else if (
    ctx.includes("korthia") ||
    ctx.includes("кортия") ||
    ctx.includes("maw") ||
    ctx.includes("утроба")
  ) {
    target = {
      mapId: 1961,
      x: 60.8,
      y: 21.8,
      label: "Приют Хранителя (Кортия / Утроба)",
      labelEn: "Keeper's Respite (Korthia / The Maw)",
    };
  } else if (
    ctx.includes("war within") ||
    ctx.includes("khaz algar") ||
    ctx.includes("dorn") ||
    ctx.includes("ramolith") ||
    ctx.includes("hallowfall") ||
    ctx.includes("azj-kahet")
  ) {
    target = {
      mapId: 2339,
      x: 46.2,
      y: 49.4,
      label: "Дорногал (Остров Дорн)",
      labelEn: "Dornogal (Isle of Dorn)",
    };
  } else if (
    ctx.includes("emerald dream") ||
    ctx.includes("amirdrassil") ||
    ctx.includes("dreamsaber") ||
    ctx.includes("dreamstag") ||
    ctx.includes("dreamtalon")
  ) {
    target = {
      mapId: 2200,
      x: 50.2,
      y: 61.6,
      label: "Центральный лагерь (Изумрудный Сон)",
      labelEn: "Central Encampment (Emerald Dream)",
    };
  } else if (ctx.includes("forbidden reach") || ctx.includes("vorquin")) {
    target = {
      mapId: 2151,
      x: 35.4,
      y: 59.4,
      label: "Деревня Моркут (Запретный край)",
      labelEn: "Morqut Village (The Forbidden Reach)",
    };
  } else if (ctx.includes("zaralek") || ctx.includes("shalewing")) {
    target = {
      mapId: 2133,
      x: 56.2,
      y: 56.0,
      label: "Лоамм (Пещера Заралек)",
      labelEn: "Loamm (Zaralek Cavern)",
    };
  } else if (
    ctx.includes("dragonflight") ||
    ctx.includes("valdrakken") ||
    ctx.includes("ottuk") ||
    ctx.includes("skitterfly") ||
    ctx.includes("armoredon") ||
    ctx.includes("magmammoth")
  ) {
    target = {
      mapId: 2112,
      x: 58.0,
      y: 35.6,
      label: "Валдраккен (Тальдразус)",
      labelEn: "Valdrakken (Thaldraszus)",
    };
  } else if (ctx.includes("mechagon") || ctx.includes("мехагон")) {
    target = {
      mapId: 1462,
      x: 73.6,
      y: 36.6,
      label: "Ржавоболт (Остров Мехагон)",
      labelEn: "Rustbolt (Mechagon Island)",
    };
  } else if (ctx.includes("nazjatar") || ctx.includes("назжатар")) {
    target = {
      mapId: 1355,
      x: 48.6,
      y: 60.6,
      label: "Новый дом / Мезамир (Назжатар)",
      labelEn: "Newhome / Mezzamere (Nazjatar)",
    };
  } else if (
    ctx.includes("battle for azeroth") ||
    ctx.includes("zuldazar") ||
    ctx.includes("dazar") ||
    ctx.includes("voldun") ||
    ctx.includes("nazmir") ||
    ctx.includes("krolusk") ||
    ctx.includes("pterrordax")
  ) {
    target = {
      mapId: 1165,
      x: 50.0,
      y: 40.0,
      label: "Великая печать (Дазар’алор)",
      labelEn: "The Great Seal (Dazar'alor)",
    };
  } else if (
    ctx.includes("argus") ||
    ctx.includes("antorus") ||
    ctx.includes("ruinstrider") ||
    ctx.includes("mana ray") ||
    ctx.includes("felcrusher")
  ) {
    target = {
      mapId: 830,
      x: 55.4,
      y: 67.2,
      label: "Виндикар (Аргус)",
      labelEn: "The Vindicaar (Argus)",
    };
  } else if (
    ctx.includes("legion") ||
    ctx.includes("suramar") ||
    ctx.includes("broken isles") ||
    ctx.includes("class") ||
    ctx.includes("felscorned")
  ) {
    target = {
      mapId: 619,
      x: 45.8,
      y: 64.4,
      label: "Даларан / Базар Бесконечности (Расколотые острова)",
      labelEn: "Dalaran / Infinite Bazaar (Broken Isles)",
    };
  } else if (
    ctx.includes("draenor") ||
    ctx.includes("tanaan") ||
    ctx.includes("garrison") ||
    ctx.includes("frostfire") ||
    ctx.includes("gorgrond") ||
    ctx.includes("talador") ||
    ctx.includes("nagrand")
  ) {
    target = {
      mapId: 534,
      x: 58.6,
      y: 60.0,
      label: "Танаанские джунгли / Гарнизон (Дренор)",
      labelEn: "Tanaan Jungle / Garrison (Draenor)",
    };
  } else if (
    ctx.includes("pandaria") ||
    ctx.includes("cloud serpent") ||
    ctx.includes("crane") ||
    ctx.includes("direhorn") ||
    ctx.includes("yak") ||
    ctx.includes("goat") ||
    ctx.includes("shado-pan")
  ) {
    target = {
      mapId: 390,
      x: 82.2,
      y: 29.4,
      label: "Святилище Двух Лун / Дворец Могу’шан (Пандария)",
      labelEn: "Shrine of Two Moons / Mogu'shan Palace (Pandaria)",
    };
  } else if (
    ctx.includes("cataclysm") ||
    ctx.includes("hyjal") ||
    ctx.includes("uldum") ||
    ctx.includes("deepholm") ||
    ctx.includes("vashj") ||
    ctx.includes("camel")
  ) {
    target = {
      mapId: 85,
      x: 50.4,
      y: 38.2,
      label: "Порталы Катаклизма (Аллея Мудрости, Оргриммар)",
      labelEn: "Cataclysm Portals (Valley of Wisdom, Orgrimmar)",
    };
  } else if (
    ctx.includes("argent") ||
    ctx.includes("tournament") ||
    ctx.includes("sunreaver") ||
    ctx.includes("champion")
  ) {
    target = {
      mapId: 118,
      x: 76.2,
      y: 19.6,
      label: "Ристалище Серебряного турнира (Ледяная Корона)",
      labelEn: "Argent Tournament Grounds (Icecrown)",
    };
  } else if (
    ctx.includes("wrath") ||
    ctx.includes("northrend") ||
    ctx.includes("icecrown") ||
    ctx.includes("ulduar") ||
    ctx.includes("proto-drake") ||
    ctx.includes("mammoth")
  ) {
    target = {
      mapId: 125,
      x: 58.2,
      y: 42.4,
      label: "Даларан (Нордскол — Лавка Мей Франкис)",
      labelEn: "Dalaran (Northrend — Mei Francis)",
    };
  } else if (
    ctx.includes("burning crusade") ||
    ctx.includes("outland") ||
    ctx.includes("netherwing") ||
    ctx.includes("nether ray") ||
    ctx.includes("talbuk")
  ) {
    target = {
      mapId: 111,
      x: 54.0,
      y: 44.0,
      label: "Шаттрат (Запределье)",
      labelEn: "Shattrath City (Outland)",
    };
  } else if (
    ctx.includes("pvp") ||
    ctx.includes("vicious") ||
    ctx.includes("gladiator") ||
    ctx.includes("prestigious") ||
    ctx.includes("war ")
  ) {
    target = {
      mapId: 85,
      x: 38.2,
      y: 70.6,
      label: "Зал Легенд / Торговец PvP (Оргриммар)",
      labelEn: "Hall of Legends / PvP Vendor (Orgrimmar)",
    };
  }

  const finalLabelEn = target.labelEn || enTitle;

  return {
    mapId: target.mapId,
    x: target.x,
    y: target.y,
    label: target.label,
    labelEn: finalLabelEn,
    tomtomCmd: `/way #${target.mapId} ${target.x.toFixed(1)} ${target.y.toFixed(
      1
    )} ${target.label}`,
    tomtomCmdEn: `/way #${target.mapId} ${target.x.toFixed(
      1
    )} ${target.y.toFixed(1)} ${finalLabelEn}`,
    blizzardMacro: `/run C_Map.SetUserWaypoint(UiMapPoint.CreateFromCoordinates(${
      target.mapId
    },${(target.x / 100).toFixed(4)},${(target.y / 100).toFixed(
      4
    )})) C_SuperTracked.SetSuperTrackedUserWaypoint(true) print("📌 Булавка на карте: ${target.label.replace(
      /"/g,
      ""
    )}")`,
    blizzardMacroEn: `/run C_Map.SetUserWaypoint(UiMapPoint.CreateFromCoordinates(${
      target.mapId
    },${(target.x / 100).toFixed(4)},${(target.y / 100).toFixed(
      4
    )})) C_SuperTracked.SetSuperTrackedUserWaypoint(true) print("📌 Map Pin: ${finalLabelEn.replace(
      /"/g,
      ""
    )}")`,
  };
}

function extractMountsFromSimpleArmoryJson(rootData) {
  const results = [];
  const seen = new Set();

  function walk(node, catName = "", subcatName = "") {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, catName, subcatName));
      return;
    }

    const nextCat = node.name && !catName ? node.name : catName;
    const nextSub =
      node.name && catName && node.name !== catName ? node.name : subcatName;

    if (Array.isArray(node.items)) {
      node.items.forEach((item) => {
        if (!item || typeof item !== "object") return;
        const nameEn = item.name || "";
        const spellId = Number(item.spellid || item.spellId || 0);
        const itemId = Number(item.itemId || item.itemid || 0);
        const mountId = Number(item.mountid || item.mountId || 0);
        const key = normalizeMountEnKey(nameEn) || `${mountId}_${spellId}`;
        if (!nameEn || seen.has(key)) return;
        seen.add(key);

        results.push({
          raw: item,
          nameEn,
          spellId,
          itemId,
          mountId,
          icon: item.icon || "",
          catName: nextCat || "World of Warcraft",
          subcatName: nextSub || "Коллекция",
        });
      });
    }

    Object.values(node).forEach((val) => {
      if (val && typeof val === "object" && val !== node.items) {
        walk(val, nextCat, nextSub);
      }
    });
  }

  walk(rootData);
  return results;
}

function normalizeRealmSlug(realmInput) {
  let raw = String(realmInput || "")
    .trim()
    .toLowerCase();
  if (!raw) return "gordunni";

  // If user selected format like "Пиратская Бухта (Booty Bay)", extract English part or strip parens
  const parenMatch = raw.match(/\(([^)]+)\)/);
  if (parenMatch && /[a-z]/i.test(parenMatch[1])) {
    const inside = parenMatch[1].replace(/\b(eu|us|ru)\b/gi, "").trim();
    if (inside) raw = inside.toLowerCase();
  }

  const ruMap = {
    гордунни: "gordunni",
    "ревущий фьорд": "howling-fjord",
    "свежеватель душ": "soulflayer",
    "ясеневый лес": "ashenvale",
    азурегос: "azuregos",
    "черный шрам": "blackscar",
    "чёрный шрам": "blackscar",
    "пиратская бухта": "booty-bay",
    "борейская тундра": "borean-tundra",
    "страж смерти": "deathguard",
    подземье: "deepholm",
    дракономор: "fordragon",
    "вечная песня": "eversong",
    галакронд: "galakrond",
    голдринн: "goldrinn",
    седогрив: "greymane",
    "король-лич": "lich-king",
    "король лич": "lich-king",
    разувий: "razuvious",
    термоштепсель: "thermaplugg",
    гром: "grom",
    "ткач смерти": "deathweaver",
  };

  if (ruMap[raw]) return ruMap[raw];
  return raw
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function extractMountArrayFromAnyPayload(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.mounts)) return data.mounts;
  if (Array.isArray(data?.mounts?.collected)) return data.mounts.collected;
  if (Array.isArray(data?.mounts?.mounts)) return data.mounts.mounts;
  if (Array.isArray(data?.collected)) return data.collected;
  if (Array.isArray(data?.character?.mounts?.collected))
    return data.character.mounts.collected;
  if (Array.isArray(data?.character?.mounts)) return data.character.mounts;
  return null;
}

function normalizeSingleApiMount(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" || typeof raw === "string") {
    const num = Number(raw);
    if (!Number.isNaN(num) && num > 0) {
      return {
        id: num,
        mountId: num,
        spellId: 0,
        itemId: 0,
        nameEn: "",
        nameRu: "",
      };
    }
    const str = String(raw).trim();
    return str
      ? { id: 0, mountId: 0, spellId: 0, itemId: 0, nameEn: str, nameRu: "" }
      : null;
  }
  if (typeof raw !== "object") return null;

  const nestedMount =
    raw.mount && typeof raw.mount === "object" ? raw.mount : null;
  const hrefIdMatch = String(
    nestedMount?.key?.href || raw?.key?.href || ""
  ).match(/\/mount\/(\d+)/);
  const mountId = Number(
    nestedMount?.id ||
      raw.mountId ||
      raw.mountid ||
      (hrefIdMatch ? hrefIdMatch[1] : 0) ||
      (!raw.spellId && !raw.spellid ? raw.id : 0) ||
      0
  );
  const spellId = Number(
    raw.spellId || raw.spellid || nestedMount?.spellId || 0
  );
  const itemId = Number(raw.itemId || raw.itemid || nestedMount?.itemId || 0);

  const rawNameField =
    nestedMount?.name ?? raw.nameEn ?? raw.name ?? raw.mountName ?? "";
  let nameEn = "";
  let nameRu = String(raw.nameRu || "").trim();
  if (typeof rawNameField === "string") {
    nameEn = rawNameField;
  } else if (rawNameField && typeof rawNameField === "object") {
    nameEn =
      rawNameField.en_US ||
      rawNameField.en_GB ||
      Object.values(rawNameField)[0] ||
      "";
    nameRu = rawNameField.ru_RU || nameRu;
  }

  return {
    id: mountId || spellId || itemId || 0,
    mountId,
    spellId,
    itemId,
    nameEn: String(nameEn || "").trim(),
    nameRu: String(nameRu || "").trim(),
    icon: raw.icon || nestedMount?.icon || "",
  };
}

// Цветовая градация сложности получения маунта от Серого (просто купить) до Золотого (фарм рейдов / хардкор)
function getMountDifficultyBadge(mount) {
  const cat = String(mount?.category || "").toLowerCase();
  const normEn = normalizeMountEnKey(mount?.nameEn || "");
  const ctx = `${mount?.nameEn || ""} ${mount?.nameRu || ""} ${
    mount?.zone || ""
  } ${mount?.expansion || ""} ${mount?.summary || ""} ${
    mount?.requirementsRu || ""
  }`.toLowerCase();

  // Уровень 5 — ЗОЛОТОЙ (Фарм рейдов, мировые боссы ~1%, Сундуки идеала, Гладиатор, ультра-редкие спауны)
  if (
    cat === "raid" ||
    ctx.includes("gladiator") ||
    ctx.includes("гладиатор") ||
    ctx.includes("paragon") ||
    ctx.includes("сундук идеала") ||
    ctx.includes("1 раз в неделю") ||
    ctx.includes("рейдового босса") ||
    ctx.includes("time-lost proto-drake") ||
    ctx.includes("phosphorescent stone drake") ||
    ctx.includes("voidtalon") ||
    ctx.includes("solar spirehawk") ||
    ctx.includes("son of galleon")
  ) {
    let label = "🟡 Фарм рейда (~1% КД)";
    let labelEn = "🟡 Raid Farm (~1% Weekly)";
    if (ctx.includes("gladiator") || ctx.includes("гладиатор")) {
      label = "🟡 Хардкор (Гладиатор PvP)";
      labelEn = "🟡 Hardcore (Gladiator PvP)";
    } else if (ctx.includes("paragon") || ctx.includes("идеала")) {
      label = "🟡 Хардкор (Сундук идеала)";
      labelEn = "🟡 Hardcore (Paragon Cache)";
    } else if (
      ctx.includes("time-lost") ||
      ctx.includes("phosphorescent") ||
      ctx.includes("voidtalon")
    ) {
      label = "🟡 Хардкор (Редкий спаун)";
      labelEn = "🟡 Hardcore (Rare World Spawn)";
    }
    return {
      tier: 5,
      key: "gold",
      label,
      labelEn,
      badgeClass:
        "bg-gradient-to-r from-amber-500/30 to-yellow-500/25 text-amber-200 border border-amber-400/70 shadow-sm",
      title:
        "Золотой уровень сложности: Еженедельный фарм рейдов (~1% шанс), редкие мировые спауны или элитное PvP",
      titleEn:
        "Gold Difficulty Tier: Weekly raid boss farm (~1% drop), rare world spawns, or Gladiator PvP",
    };
  }

  // Уровень 1 — СЕРЫЙ (Просто купить у торговца за золото, Торговая лавка, Бронза, Аукцион)
  if (
    cat === "vendor" ||
    STRICT_RACIAL_VENDOR_WHITELIST.has(normEn) ||
    ctx.includes("расового торговца") ||
    ctx.includes("торговая лавка") ||
    ctx.includes("trading post") ||
    ctx.includes("базаре бесконечности") ||
    ctx.includes("мей франкис") ||
    ctx.includes("дядюшки толстая сума")
  ) {
    return {
      tier: 1,
      key: "gray",
      label: "⚪ Просто купить",
      labelEn: "⚪ Easy Vendor Buy",
      badgeClass: "bg-slate-500/25 text-slate-200 border border-slate-400/50",
      title:
        "Серый уровень сложности: Прямая покупка у торговца без фарма и сложной прокачки",
      titleEn:
        "Gray Difficulty Tier: Direct purchase from a vendor without grinding",
    };
  }

  // Уровень 4 — ФИОЛЕТОВЫЙ (Репутация / Известность / Ковенант / Достижения «Слава» / Седло ярости)
  if (
    cat === "reputation" ||
    cat === "achievement" ||
    mount?.noRepRequired === false ||
    ctx.includes("превознесение") ||
    ctx.includes("известност") ||
    ctx.includes("ковенант") ||
    ctx.includes("седло ярости") ||
    ctx.includes("vicious") ||
    ctx.includes("слава рейдеру") ||
    ctx.includes("слава герою")
  ) {
    const isAch =
      cat === "achievement" ||
      ctx.includes("достижени") ||
      ctx.includes("слава");
    const isPvp =
      ctx.includes("седло ярости") ||
      ctx.includes("vicious") ||
      ctx.includes("уровень чести");
    return {
      tier: 4,
      key: "purple",
      label: isAch
        ? "🟣 Достижение / Слава"
        : isPvp
        ? "🟣 Гринд PvP (Седло)"
        : "🟣 Гринд репутации",
      labelEn: isAch
        ? "🟣 Achievement / Glory"
        : isPvp
        ? "🟣 PvP Grind (Vicious)"
        : "🟣 Reputation Grind",
      badgeClass:
        "bg-purple-500/25 text-purple-200 border border-purple-400/50",
      title:
        "Фиолетовый уровень сложности: Требуется прокачка репутации/известности или выполнение мета-достижения",
      titleEn:
        "Purple Difficulty Tier: Requires Reputation/Renown grind or meta-achievement completion",
    };
  }

  // Уровень 2 — ЗЕЛЁНЫЙ (Лёгкая 100% добыча: сокровище без боя, 100% рарник, 100% данж за 1 заход)
  if (
    cat === "treasure" ||
    cat === "rare100" ||
    cat === "dungeon100" ||
    (mount?.noRepRequired !== false &&
      mount?.isOneTime &&
      (mount?.timeMinutes || 25) <= 15)
  ) {
    let label = "🟢 Легко (100% добыча)";
    let labelEn = "🟢 Easy (100% Guaranteed)";
    if (cat === "treasure") {
      label = "🟢 Легко (Сокровище 100%)";
      labelEn = "🟢 Easy (100% Treasure)";
    } else if (cat === "rare100") {
      label = "🟢 Легко (Рарник 100%)";
      labelEn = "🟢 Easy (100% Rare Spawn)";
    } else if (cat === "dungeon100") {
      label = "🟢 Легко (Данж 100%)";
      labelEn = "🟢 Easy (100% Dungeon)";
    }
    return {
      tier: 2,
      key: "green",
      label,
      labelEn,
      badgeClass:
        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
      title:
        "Зелёный уровень сложности: 100% гарантированное получение в одиночку без репутации",
      titleEn:
        "Green Difficulty Tier: 100% guaranteed solo drop with zero reputation required",
    };
  }

  // Уровень 3 — СИНИЙ (Средняя сложность: фарм данжей, секреты/головоломки, цепочки квестов, знаки PvP, профессии)
  let blueLabel = "🔵 Средне (Квест / Ивент)";
  let blueLabelEn = "🔵 Medium (Quest / Event)";
  if (cat === "dungeon") {
    blueLabel = "🔵 Фарм подземелья";
    blueLabelEn = "🔵 Dungeon Boss Farm";
  } else if (cat === "puzzle") {
    blueLabel = "🔵 Секрет / Крафт";
    blueLabelEn = "🔵 Secret / Crafting";
  } else if (cat === "pvp") {
    blueLabel = "🔵 PvP (Почетные знаки)";
    blueLabelEn = "🔵 PvP (Marks of Honor)";
  }

  return {
    tier: 3,
    key: "blue",
    label: blueLabel,
    labelEn: blueLabelEn,
    badgeClass: "bg-sky-500/20 text-sky-300 border border-sky-400/40",
    title:
      "Синий уровень сложности: Фарм подземелий, секретные цепочки, ремесло или покупка за знаки PvP",
    titleEn:
      "Blue Difficulty Tier: 5-player dungeon farm, secret puzzles, crafting, or Marks of Honor",
  };
}

// Перевод описаний, зон и требований маунта на английский при включении режима EN
const RU_TO_EN_PHRASE_MAP = [
  ["🆓 Доступно на Триале (10–20 ур.)", "🆓 Trial Compatible (Lv 10–20)"],
  [
    "Доступно на Триале (Героический/Обычный)",
    "Trial Compatible (Normal/Heroic)",
  ],
  ["Доступно на Триале", "Trial Compatible"],
  ["💳 Требуется Подписка", "💳 Subscription Required"],
  ["Подписка (Вход в рейд)", "Subscription (Raid Entry)"],
  ["Подписка (Эпохальный режим)", "Subscription (Mythic Mode)"],
  ["Подписка", "Subscription"],
  ["0 репутации", "0 Reputation Required"],
  ["Нужна репутация", "Reputation Required"],
  ["100% разовая гарантия", "100% One-Time Guaranteed"],
  ["Фарм / Цепочка", "Drop Farm / Questline"],
  [
    "Покупается напрямую у базового расового торговца верховыми животными за",
    "Purchased directly from the capital racial mount vendor for",
  ],
  [
    "Покупается напрямую у расового торговца верховыми животными столицы за 1–10 золотых.",
    "Purchased directly from the capital racial mount vendor for 1–10 Gold.",
  ],
  [
    "Подойди к расовому торговцу маунтами (нажми «📌 Булавка» на карточке для постановки метки на карту).",
    'Visit the racial mount vendor (click "📌 Map Pin" on the card to set an in-game waypoint).',
  ],
  ["Купи поводья за", "Buy the mount for"],
  [
    "и изучи маунта — он сразу станет доступен всем персонажам аккаунта.",
    "and learn it — it immediately unlocks account-wide.",
  ],
  ["Уровень:", "Level:"],
  ["Стоимость:", "Cost:"],
  ["золотых", "Gold"],
  ["1 золотой", "1 Gold"],
  ["Орда", "Horde"],
  ["Альянс", "Alliance"],
  ["Доступно всем (10+ ур.)", "Available to All (Lv 10+)"],
  ["Раздел:", "Category:"],
  ["Коллекция персонажа", "Character Collection"],
  ["Профиль SimpleArmory / WoW", "SimpleArmory / WoW Profile"],
  ["Коллекция", "Collection"],
  ["Задания и исследования зоны", "Zone Quests & Exploration"],
  ["Добывается в контенте дополнения", "Obtained in expansion content"],
  ["источник по базе Wowhead:", "Wowhead source:"],
  [
    "Поставь булавку на карту кнопкой «📌 Булавка» и отправляйся в локацию",
    'Set a map pin using "📌 Map Pin" and head to',
  ],
  ["Выполни условие источника", "Complete the source objective"],
  [
    "проверь точного НПС или предмет по кнопке «Wowhead» внизу карточки",
    'check the exact NPC or item via the "Wowhead" link below',
  ],
  ["Редкая добыча с босса рейда", "Rare drop from raid boss in"],
  [
    "Старые рейды легко проходятся в одиночку за 10–15 минут каждым персонажем аккаунта раз в неделю.",
    "Legacy raids can be easily soloed in 10–15 minutes per character each week.",
  ],
  ["Босс рейда", "Raid Boss"],
  [
    "КД: 1 раз в неделю на каждого персонажа (шанс ~1–2%)",
    "Lockout: Once per week per character (~1–2% drop chance)",
  ],
  ["Выпадает с босса подземелья", "Drops from a dungeon boss in"],
  [
    "Занимает 5–10 минут при прохождении в одиночку.",
    "Takes 5–10 minutes to solo.",
  ],
  ["Босс подземелья", "Dungeon Boss"],
  ["Шанс ~1–3%", "Drop chance ~1–3%"],
  [
    "Покупается у интенданта фракции",
    "Purchased from the faction quartermaster",
  ],
  [
    "после достижения уровня репутации «Превознесение».",
    "after reaching Exalted reputation.",
  ],
  ["Репутация: Превознесение", "Reputation: Exalted"],
  [
    "Покупка у интенданта фракции за золото или валюту зоны",
    "Purchase from quartermaster for gold or zone currency",
  ],
  ["Точка маунта", "Mount Waypoint"],
  [
    "Торговая лавка / Столица (Оргриммар)",
    "Trading Post / Capital (Orgrimmar)",
  ],
  ["Арденвельд", "Ardenweald"],
  ["Бастион", "Bastion"],
  ["Малдраксус", "Maldraxxus"],
  ["Ревендрет", "Revendreth"],
  ["Зерет Мортис", "Zereth Mortis"],
  ["Утроба", "The Maw"],
  ["Кортия", "Korthia"],
  ["Хребет Ледяного Огня", "Frostfire Ridge"],
  ["Долина Призрачной Луны (Дренор)", "Shadowmoon Valley (Draenor)"],
  ["Награнд (Дренор)", "Nagrand (Draenor)"],
  ["Таладор", "Talador"],
  ["Горгронд", "Gorgrond"],
  ["Пики Арака", "Spires of Arak"],
  ["Ледяная Корона", "Icecrown"],
  ["Грозовая Гряда", "The Storm Peaks"],
  ["Драконий Погост", "Dragonblight"],
  ["Ревущий фьорд", "Howling Fjord"],
  ["Борейская тундра", "Borean Tundra"],
  ["Низина Шолазар", "Sholazar Basin"],
  ["Даларан", "Dalaran"],
  ["Оргриммар", "Orgrimmar"],
  ["Штормград", "Stormwind"],
  ["Стальгорн", "Ironforge"],
  ["Дарнас", "Darnassus"],
  ["Луносвет", "Silvermoon City"],
  ["Подгород", "Undercity"],
  ["Мулгор", "Mulgore"],
  ["Дуротар", "Durotar"],
  ["Тирисфаль", "Tirisfal Glades"],
  ["Леса Вечной Песни", "Eversong Woods"],
  ["Призрачные земли", "Ghostlands"],
  ["Танарис (Пещеры Времени)", "Tanaris (Caverns of Time)"],
  ["Вечноцветущий дол", "Vale of Eternal Blossoms"],
  ["Вершина Кунь-Лай", "Kun-Lai Summit"],
  ["Остров Великанов", "Isle of Giants"],
  ["Остров Грома", "Isle of Thunder"],
  ["Пустоверть", "Netherstorm"],
  ["Лес Тероккар", "Terokkar Forest"],
  ["Шаттрат", "Shattrath City"],
  ["Запределье", "Outland"],
  ["Нордскол", "Northrend"],
  ["Пандария", "Pandaria"],
  ["Дренор", "Draenor"],
  ["Расколотые острова", "Broken Isles"],
  ["Аргус", "Argus"],
  ["Изумрудный Сон", "Emerald Dream"],
  ["Остров Дорн", "Isle of Dorn"],
  ["Тайносводье", "Hallowfall"],
  ["Аз-Кахет", "Azj-Kahet"],
];

function localizeTextByLang(text, lang) {
  if (!text || lang !== "en") return text || "";
  let out = String(text);
  for (const [ru, en] of RU_TO_EN_PHRASE_MAP) {
    if (out.includes(ru)) {
      out = out.split(ru).join(en);
    }
  }
  return out;
}

// Complete English guides for curated mounts & exact Wowhead entries so zero Russian ever appears in EN mode
const ENGLISH_CURATED_MOUNT_DATA = {
  [normalizeMountEnKey("Wildseed Cradle")]: {
    zoneEn: "Ardenweald",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • 100% One-Time Treasure (No Combat)",
    summaryEn:
      "Collect the 5 missing gardening tools in Tirna Vaal and return them to Twinklestar — 100% guaranteed with no combat or reputation.",
    stepsEn: [
      "Fly to the Garden of Night in Ardenweald (/way #1565 39.7 54.4) and pick up the Diary, Hammer, Flute, Wand, and Net within 50 yards.",
      "Combine the 5 items in your bags and turn them in to Twinklestar (/way #1565 40.3 52.6) to spawn the treasure chest.",
    ],
  },
  [normalizeMountEnKey("Shimmermist Runner")]: {
    zoneEn: "Ardenweald",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • 100% Maze Puzzle",
    summaryEn:
      "Follow the blue lanterns through the Mistveil Tangle maze in Ardenweald and defeat Shizgher (100% drop).",
    stepsEn: [
      "Enter the Mistveil Tangle maze (/way #1565 31.0 54.4) and take the path lit by blue lanterns at every intersection.",
      "Defeat the rare elite Shizgher (/way #1565 26.3 59.0) in the clearing and interact with the Shimmermist Runner.",
    ],
  },
  [normalizeMountEnKey("Silverwind Larion")]: {
    zoneEn: "Bastion",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • Collect 50 Anima Crystal Shards",
    summaryEn:
      "Collect 50 Anima Crystal Shards across Bastion (no Covenant or reputation required) and ring the Silver Wind Vesper.",
    stepsEn: [
      "Collect the 50 hidden Anima Crystal Shards across Bastion using HandyNotes coordinates.",
      "Forge the Crystal Mallet at Hephaesius and ring the Vesper of the Silver Wind (/way #1533 59.3 39.1) to claim the mount.",
    ],
  },
  [normalizeMountEnKey("Swift Gloomhoof")]: {
    zoneEn: "Ardenweald",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • 100% Drop from Nightmare Mare",
    summaryEn:
      "Repair the Broken Soulweb in Ardenweald to enter the Shadow Realm and defeat Nightmare Mare (100% drop).",
    stepsEn: [
      "Loot the Broken Soulweb (/way #1565 58.6 26.8) and have Elder Gwenna repair it in Heart of the Forest.",
      "Use the Repaired Soulweb in Tirna Scithe (/way #1565 62.6 36.8) and defeat Nightmare Mare.",
    ],
  },
  [normalizeMountEnKey("Spinemaw Gladechewer")]: {
    zoneEn: "Ardenweald",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • 100% Drop from Gormtamer Tizo",
    summaryEn:
      "Defeat Gormtamer Tizo in the Mistveil Tangle of Ardenweald — 100% guaranteed mount drop.",
    stepsEn: [
      "Locate Gormtamer Tizo in Ardenweald (/way #1565 27.6 51.8), dismount him from Chompy, and defeat both.",
    ],
  },
  [normalizeMountEnKey("Arboreal Gulper")]: {
    zoneEn: "Ardenweald",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • 100% Drop from Humon'gozz",
    summaryEn:
      "Loot an Unusually Large Mushroom from Ardenweald mobs and plant it in Damp Loam to summon Humon'gozz (100% drop).",
    stepsEn: [
      "Farm mobs in northern Ardenweald for 5–10 minutes until an Unusually Large Mushroom drops.",
      "Plant the mushroom in the Damp Loam (/way #1565 32.4 30.2) and defeat Humon'gozz.",
    ],
  },
  [normalizeMountEnKey("Sinrunner Blanchy")]: {
    zoneEn: "Revendreth",
    requirementsEn:
      "🆓 Trial Compatible (Lv 10–20) • 0 Reputation Required • 6 Daily Interactions in Revendreth",
    summaryEn:
      "Bring oats, a grooming brush, horseshoes, clean water, a saddle blanket, and apples to Dead Blanchy over 6 days.",
    stepsEn: [
      "Gather 8 Handfuls of Oats in Westfall, a bucket of water, 4 horseshoes, and 3 Dredhollow Apples in Revendreth.",
      "Stand in Blanchy's path (/way #1525 63.2 43.0) to stop her and turn in one item per day for 6 days.",
    ],
  },
  [normalizeMountEnKey("Slime Serpent")]: {
    zoneEn: "Maldraxxus (Plaguefall)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Solo Dungeon Reward (Heroic/Mythic Plaguefall)",
    summaryEn:
      "Clear Plaguefall on Heroic or Mythic difficulty solo and pet the Curious Slime Serpent.",
    stepsEn: [
      "Enter Plaguefall in Maldraxxus on Heroic or Mythic difficulty solo.",
      "Defeat all 4 bosses, return to Domina Venomblade's platform, and pet the Curious Slime Serpent in the acid pool.",
    ],
  },
  [normalizeMountEnKey("Great Greytusk")]: {
    zoneEn: "Frostfire Ridge",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Gorok",
    summaryEn:
      "Defeat the rare boar Gorok in Frostfire Ridge — 100% guaranteed mount drop for all participants.",
    stepsEn: [
      "Check Gorok's 5 spawn points in Frostfire Ridge (/way #525 58.2 19.0, 63.4 80.2, 51.8 50.6).",
    ],
  },
  [normalizeMountEnKey("Swift Breezestrider")]: {
    zoneEn: "Shadowmoon Valley (Draenor)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Pathrunner",
    summaryEn:
      "100% guaranteed drop from the rare talbuk Pathrunner in Draenor's Shadowmoon Valley.",
    stepsEn: [
      "Check Pathrunner's 6 spawn points in Shadowmoon Valley (/way #539 45.8 68.2, 54.0 30.6, 43.0 32.0).",
    ],
  },
  [normalizeMountEnKey("Mottled Meadowstomper")]: {
    zoneEn: "Nagrand (Draenor)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Luk'hok",
    summaryEn:
      "100% guaranteed drop from the rare elekk Luk'hok in Draenor's Nagrand.",
    stepsEn: [
      "Check Luk'hok's spawn points in Nagrand (/way #550 76.0 30.6, 66.8 44.0, 84.4 63.6).",
    ],
  },
  [normalizeMountEnKey("Bloodhoof Bull")]: {
    zoneEn: "Nagrand (Draenor)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Nakk the Thunderer",
    summaryEn:
      "100% guaranteed drop from the rare clefthoof Nakk the Thunderer in northern Nagrand.",
    stepsEn: [
      "Check northern Nagrand (/way #550 62.8 15.0, 50.0 34.4, 55.0 35.4) and defeat Nakk the Thunderer.",
    ],
  },
  [normalizeMountEnKey("Sapphire Riverbeast")]: {
    zoneEn: "Talador",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Silthide",
    summaryEn:
      "100% guaranteed drop from the rare riverbeast Silthide in the rivers of Talador.",
    stepsEn: [
      "Check the riverbanks in Talador (/way #535 62.0 32.4, 79.4 55.2, 54.2 83.2) and defeat Silthide.",
    ],
  },
  [normalizeMountEnKey("Sunhide Gronnling")]: {
    zoneEn: "Gorgrond",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Poundfist",
    summaryEn:
      "100% guaranteed drop from the rare gronnling Poundfist in Gorgrond.",
    stepsEn: [
      "Check Poundfist's 5 spawn locations in Gorgrond (/way #543 42.0 25.0, 51.4 43.1, 47.0 54.0).",
    ],
  },
  [normalizeMountEnKey("Garn Nighthowl")]: {
    zoneEn: "Frostfire Ridge",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop from Nok-Karosh (or Buy on Auction House!)",
    summaryEn:
      "100% drop from Nok-Karosh in western Frostfire Ridge (15–30 min respawn) or purchasable on the Auction House.",
    stepsEn: [
      "Fly to the western cliffs of Frostfire Ridge (/way #525 16.0 52.2) and defeat Nok-Karosh (or buy Garn Nighthowl on the Auction House).",
    ],
  },
  [normalizeMountEnKey("Bronze Drake")]: {
    zoneEn: "Tanaris (Caverns of Time)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop in Heroic Culling of Stratholme (<25 min timer)",
    summaryEn:
      "100% drop from the Infinite Corruptor in Heroic Culling of Stratholme when reached within 25 minutes.",
    stepsEn: [
      "Set Dungeon Difficulty to Heroic and enter The Culling of Stratholme in the Caverns of Time.",
      "Clear the waves in ~8 minutes and turn left into the alley before Mal'Ganis to defeat the Infinite Corruptor.",
    ],
  },
  [normalizeMountEnKey("Black Drake")]: {
    zoneEn: "Dragonblight (The Obsidian Sanctum)",
    requirementsEn:
      "💳 Subscription (Raid Entry) • 10-Player Mode • 100% Drop from Sartharion + 3 Drakes Alive",
    summaryEn:
      "Pull and defeat Sartharion immediately in the center of 10-player Obsidian Sanctum while leaving all 3 Twilight Drakes alive (100% drop).",
    stepsEn: [
      "Set Raid Size to 10-player and enter The Obsidian Sanctum beneath Wyrmrest Temple.",
      "Attack Sartharion immediately in the center without killing the 3 outer drakes to guarantee the Black Drake.",
    ],
  },
  [normalizeMountEnKey("Twilight Drake")]: {
    zoneEn: "Dragonblight (The Obsidian Sanctum)",
    requirementsEn:
      "💳 Subscription (Raid Entry) • 25-Player Mode • 100% Drop from Sartharion + 3 Drakes Alive",
    summaryEn:
      "Pull and defeat Sartharion immediately in the center of 25-player Obsidian Sanctum while leaving all 3 Twilight Drakes alive (100% drop).",
    stepsEn: [
      "Set Raid Size to 25-player, enter The Obsidian Sanctum, and defeat Sartharion directly in 5 seconds.",
    ],
  },
  [normalizeMountEnKey("Amani Battle Bear")]: {
    zoneEn: "Ghostlands (Zul'Aman)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Drop for Freeing All 4 Prisoners in Heroic Zul'Aman",
    summaryEn:
      "Defeat the first 4 animal bosses in Heroic Zul'Aman before the sacrifice timer expires to free Kasha (100% drop).",
    stepsEn: [
      "Enter Heroic Zul'Aman, bang the gong, and defeat the first 4 bosses in sequence.",
      "Smash Kasha's urns at the 4th boss and loot the Amani Battle Bear from Kasha's Bag.",
    ],
  },
  [normalizeMountEnKey("Vashj'ir Seahorse")]: {
    zoneEn: "Vashj'ir (Kelp'thar Forest)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • 100% Reward from Opening Vashj'ir Questline (~12 min)",
    summaryEn:
      "Complete the introductory quests in Kelp'thar Forest (Vashj'ir) up to \"The Abyssal Ride\" for a 100% guaranteed mount.",
    stepsEn: [
      "Pick up the Vashj'ir starter quest from the Command Board in Orgrimmar or Stormwind.",
      'Follow the quests to Moanah Stormhoof and complete "The Abyssal Ride" by luring the seahorse.',
    ],
  },
  [normalizeMountEnKey("Red Flying Cloud")]: {
    zoneEn: "Vale of Eternal Blossoms",
    requirementsEn:
      "🆓 Trial Compatible • 0 Combat Required • Read Lore Objects Across Pandaria (Exalted Lorewalkers in 25 min)",
    summaryEn:
      "Fly around Pandaria to click historical lore scrolls — instantly raises The Lorewalkers from Neutral to Exalted in 25 minutes!",
    stepsEn: [
      'Click the Pandaria lore objects for achievements like "Ballad of Liu Lang", "Heart of the Mantid Swarm", and "Between a Saurok and a Hard Place".',
      "Turn in the mailed scrolls to Lorewalker Cho and buy the Disc of the Red Flying Cloud at Mogu'shan Palace.",
    ],
  },
  [normalizeMountEnKey("Riddler's Mind-Worm")]: {
    zoneEn: "Westfall (Final Chest)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • Read 8 Secret Pages in Exact Order",
    summaryEn:
      "Read the 8 secret Riddler pages in sequence and open the Gift of the Mind-Seekers chest on the Westfall coast.",
    stepsEn: [
      "Read pages #9, #78, #161, #655, #845, #1127, #2051, and #5555 in exact numerical order.",
      'Open the "Gift of the Mind-Seekers" chest on the shore of Westfall (/way #52 30.5 28.0).',
    ],
  },
  [normalizeMountEnKey("Lucid Nightmare")]: {
    zoneEn: "Deadwind Pass (Forgotten Crypt)",
    requirementsEn:
      "🆓 Trial Compatible • 0 Reputation Required • Secret Puzzle Chain + Endless Halls Maze",
    summaryEn:
      "Secret void unicorn awarded for solving 7 riddles and navigating the Endless Halls maze.",
    stepsEn: [
      "Follow the 7 secret notes from Dalaran to Kun-Lai Summit.",
      "Match all 5 colored orbs in the Endless Halls and loot the Lucid Nightmare in the Forgotten Crypt behind Karazhan (/way #42 39.8 73.6).",
    ],
  },
  [normalizeMountEnKey("Spectral Wolf")]: {
    zoneEn: "Tol Barad Peninsula (Hellscream's Reach)",
    requirementsEn:
      "Horde • Exalted with Hellscream's Reach • Cost: 165 Tol Barad Commendations",
    summaryEn:
      "Purchased from Quartermaster Pogg on the Tol Barad Peninsula for 165 Tol Barad Commendations at Exalted.",
    stepsEn: [
      "Take the portal to Tol Barad Peninsula from the Valley of Wisdom in Orgrimmar.",
      "Complete daily quests at Hellscream's Grasp to reach Exalted and earn 165 Tol Barad Commendations.",
      "Buy the mount from Quartermaster Pogg (/way #245 53.0 81.6).",
    ],
  },
  [normalizeMountEnKey("Spectral Steed")]: {
    zoneEn: "Tol Barad Peninsula (Baradin's Wardens)",
    requirementsEn:
      "Alliance • Exalted with Baradin's Wardens • Cost: 165 Tol Barad Commendations",
    summaryEn:
      "Purchased from Quartermaster Brazie on the Tol Barad Peninsula for 165 Tol Barad Commendations at Exalted.",
    stepsEn: [
      "Take the portal to Tol Barad Peninsula from Stormwind.",
      "Complete daily quests for Baradin's Wardens to reach Exalted and earn 165 Tol Barad Commendations.",
      "Buy the mount from Quartermaster Brazie in the Alliance camp.",
    ],
  },
  [normalizeMountEnKey("Ashes of Al'ar")]: {
    zoneEn: "Netherstorm (Tempest Keep: The Eye)",
    requirementsEn:
      "💳 Subscription (Raid Entry) • ~1.7% Drop from Kael'thas Sunstrider (Weekly Lockout per Character)",
    summaryEn:
      "Drops from Kael'thas Sunstrider in Tempest Keep (Netherstorm) or from the TBC Timewalking Raid Cache.",
    stepsEn: [
      "Fly to Netherstorm in Outland and enter the central ship of Tempest Keep (/way #109 73.6 63.7).",
      "Run straight to Kael'thas Sunstrider's chamber and defeat him.",
    ],
  },
  [normalizeMountEnKey("Invincible")]: {
    zoneEn: "Icecrown (Icecrown Citadel)",
    requirementsEn:
      "💳 Subscription • Raid Mode: 25-Player Heroic ONLY • ~1% Drop from The Lich King (Weekly Lockout)",
    summaryEn:
      "Drops from The Lich King in Icecrown Citadel strictly on 25-player Heroic difficulty.",
    stepsEn: [
      "Set Raid Difficulty to 25-player Heroic before entering Icecrown Citadel (/way #118 53.8 87.0).",
      "Clear the wings (Valithria Dreamwalker can be skipped by walking around her) and defeat The Lich King at the Frozen Throne.",
    ],
  },
  [normalizeMountEnKey("Mimiron's Head")]: {
    zoneEn: "The Storm Peaks (Ulduar)",
    requirementsEn:
      '💳 Subscription • Boss Condition: "Alone in the Darkness" (0 Keepers assisting) • ~1% Drop from Yogg-Saron',
    summaryEn:
      "Drops from Yogg-Saron in Ulduar when defeated without the assistance of any of the 4 Keepers.",
    stepsEn: [
      "Enter Ulduar in The Storm Peaks (/way #120 41.6 17.8), defeat the 4 Keepers, and DO NOT speak to them in the central ring.",
      "Descend to Yogg-Saron, enter the brain portals in Phase 2, and finish the boss with 0 Keepers active.",
    ],
  },
  [normalizeMountEnKey("Raven Lord")]: {
    zoneEn: "Terokkar Forest (Sethekk Halls)",
    requirementsEn:
      "🆓 Trial Compatible • Dungeon Mode: Heroic ONLY (Daily Lockout) • ~1.5% Drop from Anzu",
    summaryEn:
      "Drops from Anzu in Heroic Sethekk Halls (Auchindoun, Terokkar Forest). A Druid is no longer required to summon him.",
    stepsEn: [
      "Set Dungeon Difficulty to Heroic and enter Sethekk Halls in Terokkar Forest (/way #108 44.3 65.6).",
      "Defeat Anzu in the chamber before the final boss (resets daily).",
    ],
  },
  [normalizeMountEnKey("Swift White Hawkstrider")]: {
    zoneEn: "Isle of Quel'Danas (Magisters' Terrace)",
    requirementsEn:
      "🆓 Trial Compatible • Dungeon Mode: Heroic ONLY (Daily Lockout) • ~4% Drop from Kael'thas Sunstrider",
    summaryEn:
      "Drops from the final boss Kael'thas Sunstrider in Heroic Magisters' Terrace.",
    stepsEn: [
      "Take the portal to Isle of Quel'Danas from Shattrath and set Dungeon Difficulty to Heroic.",
      "Enter Magisters' Terrace (/way #122 61.2 30.9) and defeat Kael'thas Sunstrider.",
    ],
  },
  [normalizeMountEnKey("Rivendare's Deathcharger")]: {
    zoneEn: "Eastern Plaguelands (Stratholme)",
    requirementsEn:
      "🆓 Trial Compatible • Normal Dungeon (Resettable up to 10 times/hour!) • ~1% Drop from Lord Aurius Rivendare",
    summaryEn:
      "Drops from Lord Aurius Rivendare in Stratholme (Service Entrance). Can be farmed and reset up to 10 times per hour.",
    stepsEn: [
      "Enter Stratholme through the eastern Service Entrance (/way #23 43.4 19.4).",
      "Clear the 3 ziggurat bosses, defeat the abominations in the Slaughter Square, and kill Lord Aurius Rivendare.",
    ],
  },
};

function getLocalizedMountField(mount, fieldType, lang) {
  const normEn = normalizeMountEnKey(mount?.nameEn || "");
  const curatedEn = normEn ? ENGLISH_CURATED_MOUNT_DATA[normEn] : null;

  if (lang === "en") {
    if (fieldType === "zone") {
      const z =
        curatedEn?.zoneEn ||
        mount?.zoneEn ||
        localizeTextByLang(mount?.zone, "en") ||
        mount?.expansion ||
        "World of Warcraft";
      return /[а-яё]/i.test(z) ? mount?.expansion || "World of Warcraft" : z;
    }
    if (fieldType === "requirements") {
      const r =
        curatedEn?.requirementsEn ||
        mount?.requirementsEn ||
        localizeTextByLang(mount?.requirementsRu, "en") ||
        "";
      if (!r || /[а-яё]/i.test(r)) {
        return `${
          mount?.trialCompatible !== false
            ? "🆓 Trial Compatible (Lv 10–20)"
            : "💳 Subscription Required"
        } • ${
          mount?.noRepRequired !== false
            ? "0 Reputation Required"
            : "Reputation Required"
        } • Source: ${mount?.expansion || "World of Warcraft"}`;
      }
      return r;
    }
    if (fieldType === "summary") {
      const s =
        curatedEn?.summaryEn ||
        mount?.summaryEn ||
        localizeTextByLang(mount?.summary, "en") ||
        "";
      if (!s || /[а-яё]/i.test(s)) {
        return `Obtained in ${
          mount?.expansion || "World of Warcraft"
        } content (${
          curatedEn?.zoneEn || mount?.zoneEn || "see Wowhead guide below"
        }).`;
      }
      return s;
    }
    if (fieldType === "steps") {
      const st = curatedEn?.stepsEn || mount?.stepsEn;
      if (Array.isArray(st) && st.length > 0) return st;
      if (Array.isArray(mount?.steps) && mount.steps.length > 0) {
        return mount.steps.map((stepStr) => {
          const loc = localizeTextByLang(stepStr, "en");
          return /[а-яё]/i.test(loc)
            ? `Set an in-game map pin using "📌 Map Pin" and complete the objective for "${
                mount?.nameEn || "this mount"
              }" (see Wowhead link below).`
            : loc;
        });
      }
      return [];
    }
    if (fieldType === "pinLabel") {
      const p =
        mount?.pinLabelEn ||
        localizeTextByLang(mount?.pinLabel, "en") ||
        mount?.nameEn ||
        "Mount Waypoint";
      return /[а-яё]/i.test(p) ? mount?.nameEn || "Mount Waypoint" : p;
    }
    if (fieldType === "waypoint") {
      return mount?.waypointEn || mount?.waypoint || "";
    }
    if (fieldType === "blizzardPinMacro") {
      return mount?.blizzardPinMacroEn || mount?.blizzardPinMacro || "";
    }
    if (fieldType === "expansion") {
      const exp =
        localizeTextByLang(mount?.expansion, "en") || "World of Warcraft";
      return /[а-яё]/i.test(exp) ? "Character Collection" : exp;
    }
  }

  // Russian mode ('ru')
  if (fieldType === "zone") return mount?.zone || "";
  if (fieldType === "requirements") return mount?.requirementsRu || "";
  if (fieldType === "summary") return mount?.summary || "";
  if (fieldType === "steps")
    return Array.isArray(mount?.steps) ? mount.steps : [];
  if (fieldType === "pinLabel") return mount?.pinLabel || mount?.waypoint || "";
  if (fieldType === "waypoint") return mount?.waypoint || "";
  if (fieldType === "blizzardPinMacro") return mount?.blizzardPinMacro || "";
  if (fieldType === "expansion") return mount?.expansion || "";
  return "";
}

export default function App() {
  const savedUiInit = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(UI_SETTINGS_STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }, []);

  // Default language is English ('en')
  const [lang, setLang] = useState(() => savedUiInit.langV2 || "en"); // 'en' | 'ru'
  const tr = useCallback(
    (ruText, enText) => (lang === "en" ? enText : ruText),
    [lang]
  );

  const getMountTitles = useCallback(
    (mount) => {
      if (lang === "en") {
        const primary = mount?.nameEn || mount?.nameRu || "";
        return { primary, secondary: "" };
      }
      const primary = mount?.nameRu || mount?.nameEn || "";
      const secondary =
        mount?.nameEn && mount?.nameEn !== primary ? mount.nameEn : "";
      return { primary, secondary };
    },
    [lang]
  );

  const [activeTab, setActiveTab] = useState(
    () => savedUiInit.activeTab || "available"
  );
  const [searchQuery, setSearchQuery] = useState(
    () => savedUiInit.searchQuery || ""
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => savedUiInit.selectedCategory || "all"
  );
  const [repFilter, setRepFilter] = useState(
    () => savedUiInit.repFilter || "all"
  );
  const [accountModeFilter, setAccountModeFilter] = useState(
    () => savedUiInit.accountModeFilter || "all"
  ); // 'all' | 'trial' | 'sub_only'
  const [sortBy, setSortBy] = useState(() => savedUiInit.sortBy || "fastest");
  const [groupByZone, setGroupByZone] = useState(() =>
    Boolean(savedUiInit.groupByZone)
  );
  const [onlyHiddenGems, setOnlyHiddenGems] = useState(() =>
    Boolean(savedUiInit.onlyHiddenGems)
  );
  const [toastMessage, setToastMessage] = useState("");

  // Расширенные фильтры и настройки отображения
  const [expansionFilter, setExpansionFilter] = useState(
    () => savedUiInit.expansionFilter || "all"
  );
  const [factionFilter, setFactionFilter] = useState(
    () => savedUiInit.factionFilter || "all"
  ); // 'all' | 'Horde' | 'Alliance' | 'Both'
  const [rarityFilter, setRarityFilter] = useState(
    () => savedUiInit.rarityFilter || "all"
  ); // 'all' | 'ultra' (<5%) | 'rare' (<=15%) | 'uncommon' (<=35%) | 'common' (>35%)
  const [timeFilter, setTimeFilter] = useState(
    () => savedUiInit.timeFilter || "all"
  ); // 'all' | '10' | '30' | '60'
  const [onlyOneTimeGuaranteed, setOnlyOneTimeGuaranteed] = useState(() =>
    Boolean(savedUiInit.onlyOneTimeGuaranteed)
  );
  const [visibleLimit, setVisibleLimit] = useState(120);

  // Фильтры внутри вкладки «Моя коллекция и Престиж»
  const [collectionSearch, setCollectionSearch] = useState("");
  const [collectionRarityFilter, setCollectionRarityFilter] = useState("all");
  const [collectionSortBy, setCollectionSortBy] = useState("rarest"); // 'rarest' | 'common' | 'alpha'

  // Спринт-маршрут и интерактивные чек-листы шагов
  const [sprintBudgetMinutes, setSprintBudgetMinutes] = useState(
    () => Number(savedUiInit.sprintBudgetMinutes) || 60
  );
  const [expandedCardIds, setExpandedCardIds] = useState({});
  const [completedSteps, setCompletedSteps] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STEPS_STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  });

  // Настройки периодического авто-обновления коллекции
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    try {
      const meta = JSON.parse(
        localStorage.getItem(SYNC_META_STORAGE_KEY) || "{}"
      );
      return meta.autoSyncEnabled !== undefined
        ? Boolean(meta.autoSyncEnabled)
        : true;
    } catch (e) {
      return true;
    }
  });
  const [autoSyncIntervalMin, setAutoSyncIntervalMin] = useState(() => {
    try {
      const meta = JSON.parse(
        localStorage.getItem(SYNC_META_STORAGE_KEY) || "{}"
      );
      return Number(meta.autoSyncIntervalMin) || 5;
    } catch (e) {
      return 5;
    }
  });
  const [lastSyncTimeStr, setLastSyncTimeStr] = useState(() => {
    try {
      const meta = JSON.parse(
        localStorage.getItem(SYNC_META_STORAGE_KEY) || "{}"
      );
      return meta.lastSyncTimeStr || "";
    } catch (e) {
      return "";
    }
  });

  const [showConnectHelperModal, setShowConnectHelperModal] = useState(false);
  const [showDfaImportModal, setShowDfaImportModal] = useState(false);
  const [dfaPasteText, setDfaPasteText] = useState("");

  const [saRegion, setSaRegion] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(USER_CHAR_STORAGE_KEY) || "{}"
      );
      return saved.region || "eu";
    } catch (e) {
      return "eu";
    }
  });
  const [saRealm, setSaRealm] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(USER_CHAR_STORAGE_KEY) || "{}"
      );
      return saved.realm || "";
    } catch (e) {
      return "";
    }
  });
  const [saChar, setSaChar] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(USER_CHAR_STORAGE_KEY) || "{}"
      );
      return saved.char || "";
    } catch (e) {
      return "";
    }
  });

  const [isSyncingSa, setIsSyncingSa] = useState(false);
  const [importInputText, setImportInputText] = useState("");

  // Starts completely empty for any user until they connect or mark mounts
  const [collectedMap, setCollectedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COLLECTED_STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  });

  const [apiProfileMounts, setApiProfileMounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(API_PROFILE_STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  });

  const [goalIds, setGoalIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  });

  const [ruNameCache, setRuNameCache] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(WOWHEAD_RU_CACHE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  });

  const [customDfaRarityMap, setCustomDfaRarityMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_DFA_STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  });

  const [catalogRawMounts, setCatalogRawMounts] = useState(() => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CATALOG_CACHE_STORAGE_KEY) || "[]"
      );
      return Array.isArray(cached) ? cached : [];
    } catch (e) {
      return [];
    }
  });
  const [liveDfaRarityMap] = useState({});

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? "" : prev));
    }, 4200);
  }, []);

  const copyToClipboard = useCallback(
    (text, label = "Скопировано в буфер обмена!") => {
      if (!text) return;
      try {
        navigator.clipboard?.writeText(text);
      } catch (e) {
        // Fallback
      }
      triggerToast(label);
    },
    [triggerToast]
  );

  // Восстановление из IndexedDB при старте, если localStorage был очищен браузером
  useEffect(() => {
    let mounted = true;
    async function restoreFromIndexedDbIfNeeded() {
      const hasLocalCollected =
        Object.keys(collectedMap).length > 0 || apiProfileMounts.length > 0;
      if (!hasLocalCollected) {
        const idbCollected = await idbLoadState(COLLECTED_STORAGE_KEY);
        const idbProfile = await idbLoadState(API_PROFILE_STORAGE_KEY);
        if (mounted && idbCollected && Object.keys(idbCollected).length > 0) {
          setCollectedMap(idbCollected);
        }
        if (mounted && Array.isArray(idbProfile) && idbProfile.length > 0) {
          setApiProfileMounts(idbProfile);
        }
      }
      if (!saRealm && !saChar) {
        const idbChar = await idbLoadState(USER_CHAR_STORAGE_KEY);
        if (mounted && idbChar && (idbChar.realm || idbChar.char)) {
          if (idbChar.region) setSaRegion(idbChar.region);
          if (idbChar.realm) setSaRealm(idbChar.realm);
          if (idbChar.char) setSaChar(idbChar.char);
        }
      }
    }
    restoreFromIndexedDbIfNeeded();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(COLLECTED_STORAGE_KEY, JSON.stringify(collectedMap));
      idbSaveState(COLLECTED_STORAGE_KEY, collectedMap);
    } catch (e) {
      // Ignore
    }
  }, [collectedMap]);

  useEffect(() => {
    try {
      localStorage.setItem(
        API_PROFILE_STORAGE_KEY,
        JSON.stringify(apiProfileMounts)
      );
      idbSaveState(API_PROFILE_STORAGE_KEY, apiProfileMounts);
    } catch (e) {
      // Ignore
    }
  }, [apiProfileMounts]);

  useEffect(() => {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goalIds));
      idbSaveState(GOALS_STORAGE_KEY, goalIds);
    } catch (e) {
      // Ignore
    }
  }, [goalIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(completedSteps));
      idbSaveState(STEPS_STORAGE_KEY, completedSteps);
    } catch (e) {
      // Ignore
    }
  }, [completedSteps]);

  useEffect(() => {
    try {
      const charData = { region: saRegion, realm: saRealm, char: saChar };
      localStorage.setItem(USER_CHAR_STORAGE_KEY, JSON.stringify(charData));
      idbSaveState(USER_CHAR_STORAGE_KEY, charData);
    } catch (e) {
      // Ignore
    }
  }, [saRegion, saRealm, saChar]);

  // Автосохранение всех фильтров, открытой вкладки и настроек страницы
  useEffect(() => {
    try {
      const uiPayload = {
        langV2: lang,
        activeTab,
        searchQuery,
        selectedCategory,
        repFilter,
        accountModeFilter,
        sortBy,
        groupByZone,
        onlyHiddenGems,
        expansionFilter,
        factionFilter,
        rarityFilter,
        timeFilter,
        onlyOneTimeGuaranteed,
        sprintBudgetMinutes,
      };
      localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(uiPayload));
      idbSaveState(UI_SETTINGS_STORAGE_KEY, uiPayload);
    } catch (e) {
      // Ignore
    }
  }, [
    lang,
    activeTab,
    searchQuery,
    selectedCategory,
    repFilter,
    accountModeFilter,
    sortBy,
    groupByZone,
    onlyHiddenGems,
    expansionFilter,
    factionFilter,
    rarityFilter,
    timeFilter,
    onlyOneTimeGuaranteed,
    sprintBudgetMinutes,
  ]);

  useEffect(() => {
    try {
      const syncMeta = {
        autoSyncEnabled,
        autoSyncIntervalMin,
        lastSyncTimeStr,
      };
      localStorage.setItem(SYNC_META_STORAGE_KEY, JSON.stringify(syncMeta));
      idbSaveState(SYNC_META_STORAGE_KEY, syncMeta);
    } catch (e) {
      // Ignore
    }
  }, [autoSyncEnabled, autoSyncIntervalMin, lastSyncTimeStr]);

  const toggleStepCompleted = useCallback((mountId, stepIdx) => {
    const key = `${mountId}_step_${stepIdx}`;
    setCompletedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const toggleCardExpanded = useCallback((mountId) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [mountId]: !prev[mountId],
    }));
  }, []);

  const resetAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setRepFilter("all");
    setAccountModeFilter("all");
    setExpansionFilter("all");
    setFactionFilter("all");
    setRarityFilter("all");
    setTimeFilter("all");
    setOnlyHiddenGems(false);
    setOnlyOneTimeGuaranteed(false);
    setVisibleLimit(120);
  }, []);

  // Load full SimpleArmory catalog JSON on mount & refresh periodically
  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      // Restore from IndexedDB if localStorage cache was empty
      if (catalogRawMounts.length === 0) {
        const idbCatalog = await idbLoadState(CATALOG_CACHE_STORAGE_KEY);
        if (!cancelled && Array.isArray(idbCatalog) && idbCatalog.length > 0) {
          setCatalogRawMounts(idbCatalog);
        }
      }

      for (const url of SIMPLE_ARMORY_MOUNTS_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          const extracted = extractMountsFromSimpleArmoryJson(json);
          if (!cancelled && extracted.length > 0) {
            setCatalogRawMounts(extracted);
            try {
              localStorage.setItem(
                CATALOG_CACHE_STORAGE_KEY,
                JSON.stringify(extracted)
              );
            } catch (e) {
              // Ignore quota errors
            }
            idbSaveState(CATALOG_CACHE_STORAGE_KEY, extracted);
            return;
          }
        } catch (e) {
          // Try next mirror
        }
      }
    }
    loadCatalog();
    // Также периодически проверяем обновления глобального каталога маунтов (раз в 30 мин)
    const catalogTimer = setInterval(loadCatalog, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(catalogTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build canonical index for ID/Spell/Item/Name cross-matching
  const canonicalSaIndex = useMemo(() => {
    const idx = {};
    catalogRawMounts.forEach((entry) => {
      const norm = normalizeMountEnKey(entry.nameEn);
      if (norm) idx[norm] = entry;
      if (entry.mountId) idx[`mount_${entry.mountId}`] = entry;
      if (entry.spellId) idx[`spell_${entry.spellId}`] = entry;
      if (entry.itemId) idx[`item_${entry.itemId}`] = entry;
    });
    return idx;
  }, [catalogRawMounts]);

  // Merge offline verified mounts + full SimpleArmory catalog with official Russian & English names
  const allMounts = useMemo(() => {
    const seenKeys = new Set();
    const list = [];

    const processMount = (m) => {
      const normEn = normalizeMountEnKey(m.nameEn);
      const catMatch =
        (normEn && canonicalSaIndex[normEn]) ||
        (m.spellId && canonicalSaIndex[`spell_${m.spellId}`]) ||
        (m.itemId && canonicalSaIndex[`item_${m.itemId}`]);

      const mIdNum = Number(m.mountId || catMatch?.mountId || 0);
      const spellIdNum = Number(catMatch?.spellId || m.spellId || 0);
      const itemIdNum = Number(catMatch?.itemId || m.itemId || 0);

      const dedupKey = normEn || `id_${mIdNum}_${spellIdNum}`;
      if (seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);

      const cachedRu =
        (spellIdNum && ruNameCache[`spell_${spellIdNum}`]) ||
        (itemIdNum && ruNameCache[`item_${itemIdNum}`]) ||
        (mIdNum && ruNameCache[`mount_${mIdNum}`]) ||
        OFFICIAL_EN_TO_RU_MOUNT_NAMES[m.nameEn];

      const effectiveNameRu =
        cachedRu ||
        (m.nameRu && m.nameRu !== m.nameEn
          ? m.nameRu
          : translateMountNameToOfficialRuFallback(m.nameEn || m.nameRu));

      const normRu = normalizeMountEnKey(effectiveNameRu);

      const isCollected = Boolean(
        collectedMap[m.id] ||
          (mIdNum && collectedMap[`id_${mIdNum}`]) ||
          (spellIdNum && collectedMap[`id_${spellIdNum}`]) ||
          (itemIdNum && collectedMap[`id_${itemIdNum}`]) ||
          (normEn && collectedMap[`name_${normEn}`]) ||
          (normRu && collectedMap[`name_${normRu}`])
      );

      const rarityObj = getVerifiedDataForAzerothRarity(
        mIdNum,
        m.nameEn,
        effectiveNameRu,
        liveDfaRarityMap,
        customDfaRarityMap
      );

      const iconName = (catMatch?.icon || m.icon || "")
        .replace(/\.jpg$/i, "")
        .toLowerCase();
      const iconUrl = iconName
        ? `${WOWHEAD_ICON_BASE}${iconName}.jpg`
        : FALLBACK_MOUNT_ICON;

      const mapPin = resolveMountMapPin(m, m.expansion, m.zone);

      const exactGuide = normEn ? WOWHEAD_EXACT_MOUNT_GUIDES[normEn] : null;
      const tooltipMeta =
        (spellIdNum && ruNameCache[`tip_spell_${spellIdNum}`]) ||
        (itemIdNum && ruNameCache[`tip_item_${itemIdNum}`]) ||
        "";

      const defaultReq =
        m.requirementsRu ||
        exactGuide?.requirementsRu ||
        `${
          m.trialCompatible !== false
            ? "🆓 Доступно на Триале (10–20 ур.)"
            : "💳 Требуется Подписка"
        } • ${
          m.noRepRequired !== false ? "0 репутации" : "Нужна репутация"
        } • ${m.isOneTime ? "100% разовая гарантия" : "Фарм / Цепочка"} (${
          m.difficulty || "Легко"
        })`;

      const defaultReqEn =
        m.requirementsEn ||
        exactGuide?.requirementsEn ||
        `${
          m.trialCompatible !== false
            ? "🆓 Trial Compatible (Lv 10–20)"
            : "💳 Subscription Required"
        } • ${
          m.noRepRequired !== false
            ? "0 Reputation Required"
            : "Reputation Required"
        } • ${
          m.isOneTime ? "100% One-Time Guaranteed" : "Drop Farm / Questline"
        }`;

      const mergedMount = {
        ...m,
        mountId: mIdNum || m.mountId,
        spellId: spellIdNum || m.spellId,
        itemId: itemIdNum || m.itemId,
        nameRu: effectiveNameRu,
        nameEn: m.nameEn,
        iconUrl,
        isCollected,
        worldRarityPct: rarityObj.pct,
        worldRarityDisplay: rarityObj.display,
        isDfaVerified: rarityObj.verified,
        waypoint: mapPin.tomtomCmd,
        waypointEn: mapPin.tomtomCmdEn,
        blizzardPinMacro: mapPin.blizzardMacro,
        blizzardPinMacroEn: mapPin.blizzardMacroEn,
        pinLabel: mapPin.label,
        pinLabelEn: mapPin.labelEn,
        zoneEn: exactGuide?.zoneEn || m.zoneEn,
        requirementsRu: tooltipMeta
          ? `${defaultReq} • 🌐 Wowhead: ${tooltipMeta}`
          : defaultReq,
        requirementsEn: defaultReqEn,
        summary: exactGuide?.summary || m.summary,
        summaryEn: exactGuide?.summaryEn || m.summaryEn,
        steps:
          Array.isArray(exactGuide?.steps) && exactGuide.steps.length > 0
            ? exactGuide.steps
            : m.steps,
        stepsEn:
          Array.isArray(exactGuide?.stepsEn) && exactGuide.stepsEn.length > 0
            ? exactGuide.stepsEn
            : m.stepsEn,
      };

      mergedMount.difficultyBadge = getMountDifficultyBadge(mergedMount);
      list.push(mergedMount);
    };

    OFFLINE_VERIFIED_REAL_MOUNTS.forEach(processMount);

    catalogRawMounts.forEach((entry) => {
      const resolvedRu =
        OFFICIAL_EN_TO_RU_MOUNT_NAMES[entry.nameEn] ||
        translateMountNameToOfficialRuFallback(entry.nameEn);
      const classified = buildWowheadGuideAndRequirements(
        entry.raw,
        entry.catName,
        entry.subcatName,
        resolvedRu
      );
      processMount({
        id: `sa-${entry.mountId || entry.spellId}-${normalizeMountEnKey(
          entry.nameEn
        )}`,
        mountId: entry.mountId,
        spellId: entry.spellId,
        itemId: entry.itemId,
        nameEn: entry.nameEn,
        nameRu: resolvedRu,
        expansion: entry.catName,
        zone: classified.zone,
        zoneEn: classified.zoneEn,
        category: classified.category,
        timeMinutes: classified.timeMinutes,
        difficulty: classified.difficulty,
        isOneTime: classified.isOneTime,
        noRepRequired: classified.noRepRequired,
        trialCompatible: classified.trialCompatible,
        faction: classified.faction,
        icon: entry.icon,
        waypoint: "",
        requirementsRu: classified.requirementsRu,
        requirementsEn: classified.requirementsEn,
        summary: classified.summary,
        summaryEn: classified.summaryEn,
        steps: classified.steps,
        stepsEn: classified.stepsEn,
      });
    });

    return list;
  }, [
    canonicalSaIndex,
    catalogRawMounts,
    collectedMap,
    customDfaRarityMap,
    liveDfaRarityMap,
    ruNameCache,
  ]);

  // Background resolver for official Russian names from `nether.wowhead.com/ru/tooltip/`
  useEffect(() => {
    let cancelled = false;
    const uncached = [...allMounts]
      .sort((a, b) => (b.isCollected ? 1 : 0) - (a.isCollected ? 1 : 0))
      .filter(
        (m) =>
          (m.spellId || m.itemId) &&
          !ruNameCache[`spell_${m.spellId}`] &&
          !ruNameCache[`item_${m.itemId}`] &&
          !OFFICIAL_EN_TO_RU_MOUNT_NAMES[m.nameEn]
      )
      .slice(0, 25);

    if (uncached.length === 0) return;

    async function fetchOfficialRuNames() {
      const updates = {};
      await Promise.all(
        uncached.map(async (m) => {
          if (cancelled) return;
          const endpoints = [];
          if (m.spellId)
            endpoints.push(
              `https://nether.wowhead.com/ru/tooltip/spell/${m.spellId}`
            );
          if (m.itemId)
            endpoints.push(
              `https://nether.wowhead.com/ru/tooltip/item/${m.itemId}`
            );

          for (const url of endpoints) {
            try {
              const res = await fetch(url);
              if (!res.ok) continue;
              const data = await res.json();
              if (
                data?.name &&
                typeof data.name === "string" &&
                /[а-яё]/i.test(data.name)
              ) {
                const cleanRu = data.name
                  .replace(/^(?:Поводья|Уздечка|Свисток|Рог|Упряжь)\s+/i, "")
                  .trim();
                const finalRu =
                  cleanRu.charAt(0).toUpperCase() + cleanRu.slice(1);
                if (m.spellId) updates[`spell_${m.spellId}`] = finalRu;
                if (m.itemId) updates[`item_${m.itemId}`] = finalRu;
                if (m.mountId) updates[`mount_${m.mountId}`] = finalRu;
              }
              if (data?.tooltip && typeof data.tooltip === "string") {
                const parsedTip = parseWowheadRuTooltipHtml(data.tooltip);
                if (parsedTip) {
                  if (m.spellId) updates[`tip_spell_${m.spellId}`] = parsedTip;
                  if (m.itemId) updates[`tip_item_${m.itemId}`] = parsedTip;
                }
              }
              if (data?.name) break;
            } catch (e) {
              // Ignore CORS/network errors
            }
          }
        })
      );

      if (!cancelled && Object.keys(updates).length > 0) {
        setRuNameCache((prev) => {
          const next = { ...prev, ...updates };
          try {
            localStorage.setItem(WOWHEAD_RU_CACHE_KEY, JSON.stringify(next));
          } catch (e) {
            // Ignore
          }
          return next;
        });
      }
    }

    fetchOfficialRuNames();
    return () => {
      cancelled = true;
    };
  }, [allMounts, ruNameCache]);

  // Complete deduplicated collected mounts list with Russian title + English subtitle
  const myCollectedAll = useMemo(() => {
    const matched = allMounts.filter((m) => m.isCollected);
    const matchedIds = new Set();
    const matchedNames = new Set();

    matched.forEach((m) => {
      if (m.mountId) matchedIds.add(String(m.mountId));
      if (m.spellId) matchedIds.add(String(m.spellId));
      if (m.itemId) matchedIds.add(String(m.itemId));
      if (m.nameEn) matchedNames.add(normalizeMountEnKey(m.nameEn));
      if (m.nameRu) matchedNames.add(normalizeMountEnKey(m.nameRu));
      if (OFFICIAL_EN_TO_RU_MOUNT_NAMES[m.nameEn]) {
        matchedNames.add(
          normalizeMountEnKey(OFFICIAL_EN_TO_RU_MOUNT_NAMES[m.nameEn])
        );
      }
    });

    const extras = [];
    const seenExtraKeys = new Set();

    apiProfileMounts.forEach((rawItem, idx) => {
      const normObj = normalizeSingleApiMount(rawItem);
      if (!normObj) return;

      const candidateIds = [
        normObj.mountId,
        normObj.spellId,
        normObj.itemId,
        normObj.id,
      ]
        .filter((v) => Number(v) > 0)
        .map((v) => String(v));

      if (candidateIds.some((cid) => matchedIds.has(cid))) return;

      const idStr = candidateIds[0] || "";
      const rawNameEn = normObj.nameEn || normObj.nameRu || "";
      const normEn = normalizeMountEnKey(rawNameEn);
      const normRu = normalizeMountEnKey(normObj.nameRu);

      if (normEn && matchedNames.has(normEn)) return;
      if (normRu && matchedNames.has(normRu)) return;

      const catEntry =
        (normEn && canonicalSaIndex[normEn]) ||
        (idStr && canonicalSaIndex[`mount_${idStr}`]) ||
        (idStr && canonicalSaIndex[`spell_${idStr}`]) ||
        (idStr && canonicalSaIndex[`item_${idStr}`]);

      if (catEntry) {
        const catNormName = normalizeMountEnKey(catEntry.nameEn);
        if (catNormName && matchedNames.has(catNormName)) return;
        if (catEntry.spellId && matchedIds.has(String(catEntry.spellId)))
          return;
        if (catEntry.itemId && matchedIds.has(String(catEntry.itemId))) return;
        if (catEntry.mountId && matchedIds.has(String(catEntry.mountId)))
          return;
      }

      const dedupKey = normEn || idStr;
      if (!dedupKey || seenExtraKeys.has(dedupKey)) return;
      seenExtraKeys.add(dedupKey);

      const resolvedNameEn = catEntry?.nameEn || rawNameEn || `Mount #${idStr}`;
      const resolvedSpellId = Number(catEntry?.spellId || normObj.spellId || 0);
      const resolvedItemId = Number(catEntry?.itemId || normObj.itemId || 0);

      const ruName =
        (resolvedSpellId && ruNameCache[`spell_${resolvedSpellId}`]) ||
        (resolvedItemId && ruNameCache[`item_${resolvedItemId}`]) ||
        (idStr && ruNameCache[`mount_${idStr}`]) ||
        OFFICIAL_EN_TO_RU_MOUNT_NAMES[resolvedNameEn] ||
        (normObj.nameRu && normObj.nameRu !== resolvedNameEn
          ? normObj.nameRu
          : "") ||
        translateMountNameToOfficialRuFallback(resolvedNameEn);

      const rarityResult = getVerifiedDataForAzerothRarity(
        Number(idStr),
        resolvedNameEn,
        ruName,
        liveDfaRarityMap,
        customDfaRarityMap
      );

      const iconName = (catEntry?.icon || normObj.icon || "")
        .replace(/\.jpg$/i, "")
        .toLowerCase();
      const iconUrl = iconName
        ? `${WOWHEAD_ICON_BASE}${iconName}.jpg`
        : FALLBACK_MOUNT_ICON;

      const mapPin = resolveMountMapPin(
        {
          nameEn: resolvedNameEn,
          nameRu: ruName,
          expansion: catEntry?.catName,
          zone: catEntry?.subcatName,
        },
        catEntry?.catName,
        catEntry?.subcatName
      );

      const guideObj = buildWowheadGuideAndRequirements(
        catEntry?.raw || { name: resolvedNameEn },
        catEntry?.catName || "Коллекция персонажа",
        catEntry?.subcatName || "Профиль SimpleArmory / WoW",
        ruName
      );

      const extraMount = {
        id: `profile-extra-${idStr}-${idx}`,
        mountId:
          Number(catEntry?.mountId || normObj.mountId || idStr) || idx + 1,
        spellId: resolvedSpellId,
        itemId: resolvedItemId,
        nameRu: ruName,
        nameEn: resolvedNameEn,
        expansion: catEntry?.catName || "Character Collection",
        zone:
          guideObj.zone || catEntry?.subcatName || "SimpleArmory / WoW Profile",
        zoneEn:
          guideObj.zoneEn ||
          catEntry?.subcatName ||
          "SimpleArmory / WoW Profile",
        category: guideObj.category || "collection",
        timeMinutes: guideObj.timeMinutes || 15,
        difficulty: guideObj.difficulty || "Character Profile",
        isCollected: true,
        iconUrl,
        worldRarityPct: rarityResult.pct,
        worldRarityDisplay: rarityResult.display,
        isDfaVerified: rarityResult.verified,
        waypoint: mapPin.tomtomCmd,
        waypointEn: mapPin.tomtomCmdEn,
        blizzardPinMacro: mapPin.blizzardMacro,
        blizzardPinMacroEn: mapPin.blizzardMacroEn,
        pinLabel: mapPin.label,
        pinLabelEn: mapPin.labelEn,
        requirementsRu: guideObj.requirementsRu,
        requirementsEn: guideObj.requirementsEn,
        summary: guideObj.summary,
        summaryEn: guideObj.summaryEn,
        steps: guideObj.steps,
        stepsEn: guideObj.stepsEn,
      };
      extraMount.difficultyBadge = getMountDifficultyBadge(extraMount);
      extras.push(extraMount);
    });

    // Final hard deduplication pass by normalized English & Russian names and IDs
    const finalUnique = [];
    const finalSeenNames = new Set();
    const finalSeenIds = new Set();

    [...matched, ...extras].forEach((item) => {
      const nEn = normalizeMountEnKey(item.nameEn);
      const nRu = normalizeMountEnKey(item.nameRu);
      if (nEn && !nEn.startsWith("mount ") && finalSeenNames.has(nEn)) return;
      if (nRu && !nRu.startsWith("mount ") && finalSeenNames.has(nRu)) return;
      if (item.spellId && finalSeenIds.has(`s_${item.spellId}`)) return;

      if (nEn) finalSeenNames.add(nEn);
      if (nRu) finalSeenNames.add(nRu);
      if (item.spellId) finalSeenIds.add(`s_${item.spellId}`);
      finalUnique.push(item);
    });

    return finalUnique.sort((a, b) => a.worldRarityPct - b.worldRarityPct);
  }, [
    allMounts,
    apiProfileMounts,
    canonicalSaIndex,
    customDfaRarityMap,
    liveDfaRarityMap,
    ruNameCache,
  ]);

  const toggleCollected = useCallback((mount) => {
    setCollectedMap((prev) => {
      const next = { ...prev };
      const normEn = normalizeMountEnKey(mount.nameEn);
      const currentlyCollected = Boolean(
        next[mount.id] ||
          (mount.mountId && next[`id_${mount.mountId}`]) ||
          (mount.spellId && next[`id_${mount.spellId}`]) ||
          (mount.itemId && next[`id_${mount.itemId}`]) ||
          (normEn && next[`name_${normEn}`])
      );

      if (currentlyCollected) {
        delete next[mount.id];
        if (mount.mountId) delete next[`id_${mount.mountId}`];
        if (mount.spellId) delete next[`id_${mount.spellId}`];
        if (mount.itemId) delete next[`id_${mount.itemId}`];
        if (normEn) delete next[`name_${normEn}`];
      } else {
        next[mount.id] = true;
        if (mount.mountId) next[`id_${mount.mountId}`] = true;
        if (mount.spellId) next[`id_${mount.spellId}`] = true;
        if (mount.itemId) next[`id_${mount.itemId}`] = true;
        if (normEn) next[`name_${normEn}`] = true;
      }
      return next;
    });
  }, []);

  const toggleGoal = useCallback((mountIdStr) => {
    setGoalIds((prev) =>
      prev.includes(mountIdStr)
        ? prev.filter((id) => id !== mountIdStr)
        : [...prev, mountIdStr]
    );
  }, []);

  // Apply imported list from SimpleArmory JSON, macro IDs, or pasted names
  const applyImportedMountList = useCallback(
    (
      rawItems,
      sourceLabel = "SimpleArmory",
      options = { merge: false, silent: false }
    ) => {
      if (!Array.isArray(rawItems) || rawItems.length === 0) return false;
      const cleanProfileItems = [];
      const seenKeys = new Set();

      rawItems.forEach((raw) => {
        const norm = normalizeSingleApiMount(raw);
        if (!norm) return;

        const idVal = norm.mountId || norm.spellId || norm.itemId || norm.id;
        const normEn = normalizeMountEnKey(norm.nameEn);
        const key = idVal ? `id_${idVal}` : normEn ? `name_${normEn}` : "";
        if (!key || seenKeys.has(key)) return;
        seenKeys.add(key);

        cleanProfileItems.push(norm);
      });

      if (cleanProfileItems.length === 0) return false;

      const nowStr = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSyncTimeStr(nowStr);

      let newlyAddedCount = 0;

      setCollectedMap((prev) => {
        const nextCollected = options?.merge ? { ...prev } : {};
        cleanProfileItems.forEach((norm) => {
          const normEn = normalizeMountEnKey(norm.nameEn);
          const alreadyHad = Boolean(
            (norm.mountId && prev[`id_${norm.mountId}`]) ||
              (norm.spellId && prev[`id_${norm.spellId}`]) ||
              (norm.itemId && prev[`id_${norm.itemId}`]) ||
              (norm.id && prev[`id_${norm.id}`]) ||
              (normEn && prev[`name_${normEn}`])
          );
          if (!alreadyHad) newlyAddedCount++;

          if (norm.mountId) nextCollected[`id_${norm.mountId}`] = true;
          if (norm.spellId) nextCollected[`id_${norm.spellId}`] = true;
          if (norm.itemId) nextCollected[`id_${norm.itemId}`] = true;
          if (norm.id) nextCollected[`id_${norm.id}`] = true;
          if (normEn) nextCollected[`name_${normEn}`] = true;
        });
        return nextCollected;
      });

      setApiProfileMounts((prev) => {
        if (!options?.merge || prev.length === 0) return cleanProfileItems;
        const merged = [...prev];
        const existingKeys = new Set(
          prev.map((p) => {
            const n = normalizeSingleApiMount(p);
            const idV = n?.mountId || n?.spellId || n?.itemId || n?.id;
            return idV ? `id_${idV}` : `name_${normalizeMountEnKey(n?.nameEn)}`;
          })
        );
        cleanProfileItems.forEach((item) => {
          const idV = item.mountId || item.spellId || item.itemId || item.id;
          const k = idV
            ? `id_${idV}`
            : `name_${normalizeMountEnKey(item.nameEn)}`;
          if (!existingKeys.has(k)) {
            existingKeys.add(k);
            merged.push(item);
          }
        });
        return merged;
      });

      if (!options?.silent) {
        triggerToast(
          `✅ Синхронизировано ${cleanProfileItems.length} маунтов (${sourceLabel}) в ${nowStr}!`
        );
      } else if (newlyAddedCount > 0) {
        triggerToast(
          `🎉 Авто-обновление (${sourceLabel}): найдено +${newlyAddedCount} новых маунтов в коллекции!`
        );
      }
      return true;
    },
    [triggerToast]
  );

  const handleOneClickSimpleArmorySync = useCallback(
    async (customInput = "", syncOptions = { silent: false, merge: false }) => {
      const isSilent = Boolean(syncOptions?.silent);
      const shouldMerge = Boolean(syncOptions?.merge);
      const rawText = (
        customInput ||
        (!isSilent ? importInputText : "") ||
        ""
      ).trim();

      let activeRegion = (saRegion || "eu").toLowerCase();
      let activeRealm = saRealm.trim();
      let activeChar = saChar.trim();

      // 1. Check if rawText is a SimpleArmory or armorystats URL
      if (rawText) {
        const saUrlMatch = rawText.match(
          /simplearmory\.com\/#\/([a-z]{2})\/([^/]+)\/([^/?#]+)/i
        );
        const apiUrlMatch = rawText.match(
          /armorystats\.info\/([a-z]{2})\/([^/]+)\/([^/?#]+)/i
        );
        const match = saUrlMatch || apiUrlMatch;

        if (match) {
          activeRegion = match[1].toLowerCase();
          activeRealm = decodeURIComponent(match[2]);
          activeChar = decodeURIComponent(match[3]);
          setSaRegion(activeRegion);
          setSaRealm(activeRealm);
          setSaChar(activeChar);
          setImportInputText("");
        } else {
          // 2. Check if rawText is JSON from SimpleArmory / F12
          if (rawText.startsWith("{") || rawText.startsWith("[")) {
            try {
              const parsed = JSON.parse(rawText);
              const arr = extractMountArrayFromAnyPayload(parsed);
              if (arr && arr.length > 0) {
                applyImportedMountList(arr, "JSON SimpleArmory", {
                  merge: shouldMerge,
                  silent: isSilent,
                });
                setImportInputText("");
                return;
              }
            } catch (e) {
              // Fall through to ID parsing
            }
          }

          // 3. Check if rawText is comma/space-separated Mount IDs from the WoW in-game macro
          const idMatches = rawText.match(/\b\d+\b/g);
          if (idMatches && idMatches.length > 0) {
            const numericIds = idMatches
              .map((n) => Number(n))
              .filter((n) => n > 0);
            if (numericIds.length > 0) {
              applyImportedMountList(numericIds, "Игровой макрос WoW", {
                merge: shouldMerge,
                silent: isSilent,
              });
              setImportInputText("");
              return;
            }
          }
        }
      }

      if (!activeRealm || !activeChar) {
        if (!isSilent) {
          setShowConnectHelperModal(true);
          triggerToast(
            "Укажи сервер и имя персонажа (или вставь ссылку / ID из макроса WoW)!"
          );
        }
        return;
      }

      const realmSlug = normalizeRealmSlug(activeRealm);
      const charSlug = encodeURIComponent(activeChar.toLowerCase());
      const targetUrl = `https://armorystats.info/${activeRegion}/${realmSlug}/${charSlug}/collections/mounts`;

      const candidateUrls = [
        targetUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(
          targetUrl
        )}`,
      ];

      setIsSyncingSa(true);
      try {
        const fetchCandidate = async (url) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 9000);
          try {
            const res = await fetch(url, {
              signal: controller.signal,
              cache: "no-store",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            const data = JSON.parse(text);
            const arr = extractMountArrayFromAnyPayload(data);
            if (!arr || arr.length === 0) throw new Error("Empty mounts array");
            return arr;
          } finally {
            clearTimeout(timer);
          }
        };

        const mountsArray = await Promise.any(
          candidateUrls.map((u) => fetchCandidate(u))
        );
        applyImportedMountList(mountsArray, `SimpleArmory: ${activeChar}`, {
          merge: shouldMerge,
          silent: isSilent,
        });
      } catch (err) {
        if (!isSilent) {
          setShowConnectHelperModal(true);
          triggerToast(
            "⚠️ Профиль закрыт или заблокирован CORS — используй макрос WoW (Способ 1) или кнопку «Открыть JSON SimpleArmory» (Способ 2)!"
          );
        }
      } finally {
        setIsSyncingSa(false);
      }
    },
    [
      applyImportedMountList,
      importInputText,
      saChar,
      saRealm,
      saRegion,
      triggerToast,
    ]
  );

  // Периодическое авто-обновление коллекции (при открытии сайта, каждые N минут и при возврате на вкладку)
  useEffect(() => {
    if (!autoSyncEnabled || !saRealm.trim() || !saChar.trim()) return;

    // 1. Фоновая проверка сразу при открытии сайта
    const initialTimer = setTimeout(() => {
      handleOneClickSimpleArmorySync("", { silent: true, merge: true });
    }, 1800);

    // 2. Периодический опрос каждые autoSyncIntervalMin минут
    const intervalMs =
      Math.max(1, Number(autoSyncIntervalMin) || 5) * 60 * 1000;
    const periodicTimer = setInterval(() => {
      handleOneClickSimpleArmorySync("", { silent: true, merge: true });
    }, intervalMs);

    // 3. Проверка при возвращении игрока из окна WoW обратно на вкладку сайта
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        handleOneClickSimpleArmorySync("", { silent: true, merge: true });
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [
    autoSyncEnabled,
    autoSyncIntervalMin,
    saRealm,
    saChar,
    handleOneClickSimpleArmorySync,
  ]);

  // Экспорт и импорт полного локального файла сохранения сайта (.json)
  const handleExportSiteBackup = useCallback(() => {
    try {
      const backupPayload = {
        version: "wow-mount-tracker-backup-v1",
        exportedAt: new Date().toISOString(),
        character: { region: saRegion, realm: saRealm, char: saChar },
        collectedMap,
        apiProfileMounts,
        goalIds,
        completedSteps,
        customDfaRarityMap,
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wow-mounts-backup-${(
        saChar || "profile"
      ).toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerToast("💾 Файл сохранения (.json) успешно скачан!");
    } catch (e) {
      triggerToast("Ошибка при создании файла резервной копии");
    }
  }, [
    saRegion,
    saRealm,
    saChar,
    collectedMap,
    apiProfileMounts,
    goalIds,
    completedSteps,
    customDfaRarityMap,
    triggerToast,
  ]);

  const handleImportSiteBackup = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || "{}"));
          if (data.character) {
            if (data.character.region) setSaRegion(data.character.region);
            if (data.character.realm) setSaRealm(data.character.realm);
            if (data.character.char) setSaChar(data.character.char);
          }
          if (data.collectedMap && typeof data.collectedMap === "object") {
            setCollectedMap(data.collectedMap);
          }
          if (Array.isArray(data.apiProfileMounts)) {
            setApiProfileMounts(data.apiProfileMounts);
          }
          if (Array.isArray(data.goalIds)) {
            setGoalIds(data.goalIds);
          }
          if (data.completedSteps && typeof data.completedSteps === "object") {
            setCompletedSteps(data.completedSteps);
          }
          if (
            data.customDfaRarityMap &&
            typeof data.customDfaRarityMap === "object"
          ) {
            setCustomDfaRarityMap(data.customDfaRarityMap);
          }
          triggerToast(
            "✅ Все данные профиля и коллекции успешно восстановлены из файла!"
          );
        } catch (e) {
          triggerToast("⚠️ Не удалось прочитать файл резервной копии");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [triggerToast]
  );

  const handleClearCollection = useCallback(() => {
    setCollectedMap({});
    setApiProfileMounts([]);
    try {
      localStorage.removeItem(COLLECTED_STORAGE_KEY);
      localStorage.removeItem(API_PROFILE_STORAGE_KEY);
      idbSaveState(COLLECTED_STORAGE_KEY, {});
      idbSaveState(API_PROFILE_STORAGE_KEY, []);
    } catch (e) {
      // Ignore
    }
    triggerToast("🗑️ Коллекция очищена");
  }, [triggerToast]);

  const handleImportDfaText = useCallback(() => {
    const raw = dfaPasteText.trim();
    if (!raw) return;

    const updates = {};
    try {
      if (raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([name, val]) => {
          const cleanStr = String(val).trim();
          const num =
            cleanStr === "<1%" ? 0.5 : parseFloat(cleanStr.replace("%", ""));
          if (!Number.isNaN(num)) {
            updates[normalizeMountEnKey(name)] = num;
          }
        });
      }
    } catch (e) {
      // Fallback to line-by-line parsing
    }

    if (Object.keys(updates).length === 0) {
      const lines = raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      for (let i = 2; i < lines.length; i++) {
        if (/^(<1|\d{1,3})%$/.test(lines[i])) {
          const num =
            lines[i] === "<1%" ? 0.5 : parseFloat(lines[i].replace("%", ""));
          const candidateName = lines[i - 2];
          if (candidateName && !Number.isNaN(num)) {
            updates[normalizeMountEnKey(candidateName)] = num;
          }
        }
      }
    }

    const count = Object.keys(updates).length;
    if (count > 0) {
      setCustomDfaRarityMap((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem(CUSTOM_DFA_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          // Ignore
        }
        return next;
      });
      setShowDfaImportModal(false);
      setDfaPasteText("");
      triggerToast(
        `📊 Обновлены проценты для ${count} маунтов с Data for Azeroth!`
      );
    } else {
      triggerToast("Не удалось распознать проценты в тексте");
    }
  }, [dfaPasteText, triggerToast]);

  // Filtered & sorted mounts for the Available & Goals tabs
  const availableExpansions = useMemo(() => {
    const counts = {};
    allMounts.forEach((m) => {
      if (!m.isCollected) {
        const exp = m.expansion || "World of Warcraft";
        counts[exp] = (counts[exp] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allMounts]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      selectedCategory !== "all" ||
      repFilter !== "all" ||
      accountModeFilter !== "all" ||
      expansionFilter !== "all" ||
      factionFilter !== "all" ||
      rarityFilter !== "all" ||
      timeFilter !== "all" ||
      onlyHiddenGems ||
      onlyOneTimeGuaranteed
    );
  }, [
    searchQuery,
    selectedCategory,
    repFilter,
    accountModeFilter,
    expansionFilter,
    factionFilter,
    rarityFilter,
    timeFilter,
    onlyHiddenGems,
    onlyOneTimeGuaranteed,
  ]);

  const filteredMounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allMounts
      .filter((m) => {
        if (activeTab === "available" && m.isCollected) return false;
        if (activeTab === "goals" && !goalIds.includes(m.id)) return false;
        if (accountModeFilter === "trial" && !m.trialCompatible) return false;
        if (accountModeFilter === "sub_only" && m.trialCompatible) return false;
        if (repFilter === "norep" && !m.noRepRequired) return false;
        if (repFilter === "rep" && m.noRepRequired) return false;
        if (selectedCategory !== "all" && m.category !== selectedCategory)
          return false;
        if (expansionFilter !== "all" && m.expansion !== expansionFilter)
          return false;

        if (factionFilter === "Horde" && m.faction === "Alliance") return false;
        if (factionFilter === "Alliance" && m.faction === "Horde") return false;
        if (factionFilter === "Both" && m.faction !== "Both") return false;

        if (rarityFilter === "ultra" && (m.worldRarityPct || 50) >= 5)
          return false;
        if (rarityFilter === "rare" && (m.worldRarityPct || 50) > 15)
          return false;
        if (rarityFilter === "uncommon" && (m.worldRarityPct || 50) > 35)
          return false;
        if (rarityFilter === "common" && (m.worldRarityPct || 0) <= 35)
          return false;

        if (timeFilter !== "all") {
          if (timeFilter.startsWith("tier_")) {
            const targetTier = Number(timeFilter.replace("tier_", ""));
            if ((m.difficultyBadge?.tier || 3) !== targetTier) return false;
          } else if ((m.timeMinutes || 30) > Number(timeFilter)) {
            return false;
          }
        }
        if (onlyOneTimeGuaranteed && !m.isOneTime) return false;

        if (
          onlyHiddenGems &&
          (m.worldRarityPct > 25 || m.timeMinutes > 35 || !m.noRepRequired)
        ) {
          return false;
        }

        if (q) {
          const hay =
            `${m.nameRu} ${m.nameEn} ${m.zone} ${m.expansion} ${m.summary}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "fastest") {
          const tierDiff =
            (a.difficultyBadge?.tier || 3) - (b.difficultyBadge?.tier || 3);
          if (tierDiff !== 0) return tierDiff;
          return (a.timeMinutes || 30) - (b.timeMinutes || 30);
        }
        if (sortBy === "hardest") {
          const tierDiff =
            (b.difficultyBadge?.tier || 3) - (a.difficultyBadge?.tier || 3);
          if (tierDiff !== 0) return tierDiff;
          return (a.worldRarityPct || 50) - (b.worldRarityPct || 50);
        }
        if (sortBy === "rarest")
          return (a.worldRarityPct || 50) - (b.worldRarityPct || 50);
        if (sortBy === "common")
          return (b.worldRarityPct || 0) - (a.worldRarityPct || 0);
        if (sortBy === "prestige_efficiency") {
          const scoreA =
            (100 - (a.worldRarityPct || 50)) /
            Math.max(1, a.difficultyBadge?.tier || 3);
          const scoreB =
            (100 - (b.worldRarityPct || 50)) /
            Math.max(1, b.difficultyBadge?.tier || 3);
          return scoreB - scoreA;
        }
        return (a.nameRu || "").localeCompare(b.nameRu || "", "ru");
      });
  }, [
    allMounts,
    activeTab,
    goalIds,
    accountModeFilter,
    repFilter,
    selectedCategory,
    expansionFilter,
    factionFilter,
    rarityFilter,
    timeFilter,
    onlyOneTimeGuaranteed,
    onlyHiddenGems,
    searchQuery,
    sortBy,
  ]);

  const groupedByZoneMounts = useMemo(() => {
    const map = {};
    filteredMounts.slice(0, visibleLimit).forEach((m) => {
      const key = `${m.expansion} — ${m.zone}`;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return Object.entries(map);
  }, [filteredMounts, visibleLimit]);

  const copyBatchWaypoints = useCallback(
    (mountsList, label = "Текущая выборка") => {
      const ways = mountsList
        .map((m) => m.waypoint)
        .filter(Boolean)
        .slice(0, 25);
      if (ways.length === 0) {
        triggerToast("Нет координат /way в выбранном списке");
        return;
      }
      copyToClipboard(
        ways.join("\n"),
        `🧭 Скопировано ${ways.length} точек /way (${label}) для вставки в TomTom / чат!`
      );
    },
    [copyToClipboard, triggerToast]
  );

  // Sprint Route Builder (optimal solo mounts within selected time budget)
  const sprintRouteData = useMemo(() => {
    const candidates = allMounts
      .filter(
        (m) =>
          !m.isCollected &&
          m.noRepRequired &&
          m.isOneTime &&
          m.category !== "vendor" &&
          (accountModeFilter !== "trial" || m.trialCompatible) &&
          (accountModeFilter !== "sub_only" || !m.trialCompatible)
      )
      .sort((a, b) => (a.timeMinutes || 20) - (b.timeMinutes || 20));

    const picked = [];
    let usedMinutes = 0;
    let totalPrestigeGain = 0;

    for (const m of candidates) {
      const t = m.timeMinutes || 15;
      if (usedMinutes + t <= sprintBudgetMinutes || picked.length < 2) {
        picked.push(m);
        usedMinutes += t;
        totalPrestigeGain += Math.max(
          5,
          Math.round(100 - (m.worldRarityPct || 50))
        );
        if (usedMinutes >= sprintBudgetMinutes) break;
      }
    }

    return { picked, usedMinutes, totalPrestigeGain };
  }, [allMounts, accountModeFilter, sprintBudgetMinutes]);

  // Race & Class Alt Quick Unlock Planner
  const altUnlocksByGroup = useMemo(() => {
    const racialVendors = allMounts.filter(
      (m) => !m.isCollected && m.category === "vendor"
    );
    const hordeVendors = racialVendors.filter((m) => m.faction === "Horde");
    const allianceVendors = racialVendors.filter(
      (m) => m.faction === "Alliance"
    );
    const classAndAllied = allMounts.filter(
      (m) =>
        !m.isCollected &&
        m.category !== "vendor" &&
        /class|allied|heritage|deathcharger|felsteed|dreadsteed|felsaber|exarch|sunwalker|thalassian/i.test(
          `${m.nameEn} ${m.zone} ${m.summary}`
        )
    );

    return [
      {
        id: "horde-racial",
        title: tr(
          "🔴 Расовые торговцы столиц Орды (Оргриммар, Луносвет, Брилл, Мулгор, Сен’джин)",
          "🔴 Horde Capital Racial Vendors (Orgrimmar, Silvermoon, Brill, Mulgore, Sen'jin)"
        ),
        subtitle: tr(
          "Покупаются за 1–10 золотых любым персонажем Орды 10–20 ур. (шарят коллекцию на весь аккаунт)",
          "Purchased for 1–10 Gold on any level 10–20 Horde character (unlocks account-wide)"
        ),
        mounts: hordeVendors,
      },
      {
        id: "alliance-racial",
        title: tr(
          "🔵 Расовые торговцы столиц Альянса (Штормград, Стальгорн, Дарнас, Экзодар)",
          "🔵 Alliance Capital Racial Vendors (Stormwind, Ironforge, Darnassus, Exodar)"
        ),
        subtitle: tr(
          "Создай пробного персонажа или твинка Альянса 10 ур. и купи все 35+ маунтов за 5 минут",
          "Create a level 10 Alliance alt and buy all 35+ racial vendor mounts in 5 minutes"
        ),
        mounts: allianceVendors,
      },
      {
        id: "class-allied",
        title: tr(
          "⚔️ Классовые маунты и Союзные расы (Рыцарь смерти, Чернокнижник, Охотник на демонов, Паладин)",
          "⚔️ Class Mounts & Allied Races (Death Knight, Warlock, Demon Hunter, Paladin)"
        ),
        subtitle: tr(
          "Выдаются автоматически при создании класса/союзной расы или за стартовую цепочку",
          "Granted automatically upon creating the class/allied race or completing the intro questline"
        ),
        mounts: classAndAllied.slice(0, 30),
      },
    ].filter((g) => g.mounts.length > 0);
  }, [allMounts, tr]);

  // Filtered & sorted list inside "My Collection & Prestige" tab
  const filteredMyCollection = useMemo(() => {
    const q = collectionSearch.trim().toLowerCase();
    return myCollectedAll
      .filter((m) => {
        if (collectionRarityFilter === "ultra" && (m.worldRarityPct || 50) >= 5)
          return false;
        if (collectionRarityFilter === "rare" && (m.worldRarityPct || 15) > 15)
          return false;
        if (
          collectionRarityFilter === "uncommon" &&
          (m.worldRarityPct || 35) > 35
        )
          return false;
        if (q) {
          const hay =
            `${m.nameRu} ${m.nameEn} ${m.expansion} ${m.zone}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (collectionSortBy === "rarest")
          return (a.worldRarityPct || 50) - (b.worldRarityPct || 50);
        if (collectionSortBy === "common")
          return (b.worldRarityPct || 0) - (a.worldRarityPct || 0);
        if (lang === "en") {
          return (a.nameEn || "").localeCompare(b.nameEn || "", "en");
        }
        return (a.nameRu || "").localeCompare(b.nameRu || "", "ru");
      });
  }, [
    myCollectedAll,
    collectionSearch,
    collectionRarityFilter,
    collectionSortBy,
    lang,
  ]);

  // Official WoW Mount Collection Achievement Milestones
  const achievementMilestones = useMemo(() => {
    const tiers = [
      {
        count: 50,
        titleRu: "Вести за собой кавалерию",
        titleEn: "Leading the Cavalry",
        rewardRu: "Дракон-альбинос (Albino Drake)",
        rewardEn: "Albino Drake",
      },
      {
        count: 100,
        titleRu: "Горы маунтов",
        titleEn: "Mountain o' Mounts",
        rewardRu: "Синий / Красный дракондор",
        rewardEn: "Blue / Red Dragonhawk",
      },
      {
        count: 150,
        titleRu: "Нужно больше седел",
        titleEn: "We're Going to Need More Saddles",
        rewardRu: "Нефритовый воздушный змей Пандарии",
        rewardEn: "Jade Pandaren Kite",
      },
      {
        count: 200,
        titleRu: "Парад верховых животных",
        titleEn: "Mount Parade",
        rewardRu: "Бронированный синий / красный дракондор",
        rewardEn: "Armored Blue / Red Dragonhawk",
      },
      {
        count: 250,
        titleRu: "Соберем их все",
        titleEn: "Mountacular",
        rewardRu: "Ястреб скверноогня (Felfire Hawk)",
        rewardEn: "Felfire Hawk",
      },
      {
        count: 300,
        titleRu: "Повелитель поводьев",
        titleEn: "Lord of the Reins",
        rewardRu: "Небесный лазурный облачный змей",
        rewardEn: "Heavenly Azure Cloud Serpent",
      },
      {
        count: 400,
        titleRu: "Орда верховых животных",
        titleEn: "A Horde of Hoofbeats",
        rewardRu: "Неистовый зеленый огнеястреб",
        rewardEn: "Frenzied Feltalon",
      },
      {
        count: 500,
        titleRu: "Спасибо за маунтов!",
        titleEn: "Thanks for the Carry!",
        rewardRu: "Перевозчик загробного оттука",
        rewardEn: "Otterworldly Ottuk Carrier",
      },
    ];
    const current = myCollectedAll.length;
    const nextTier =
      tiers.find((t) => t.count > current) || tiers[tiers.length - 1];
    const remaining = Math.max(0, nextTier.count - current);
    const pct = Math.min(100, Math.round((current / nextTier.count) * 100));
    return { tiers, current, nextTier, remaining, pct };
  }, [myCollectedAll.length]);

  const top3Recommendations = useMemo(() => {
    return allMounts
      .filter(
        (m) =>
          !m.isCollected &&
          m.noRepRequired &&
          m.isOneTime &&
          (accountModeFilter !== "trial" || m.trialCompatible) &&
          (accountModeFilter !== "sub_only" || !m.trialCompatible)
      )
      .sort((a, b) => (a.timeMinutes || 30) - (b.timeMinutes || 30))
      .slice(0, 3);
  }, [allMounts, accountModeFilter]);

  const prestigeStats = useMemo(() => {
    let totalPoints = 0;
    myCollectedAll.forEach((m) => {
      const rarityBonus = Math.max(
        5,
        Math.round(100 - (m.worldRarityPct || 50))
      );
      totalPoints += rarityBonus;
    });
    const avgRarity =
      myCollectedAll.length > 0
        ? (
            myCollectedAll.reduce(
              (acc, m) => acc + (m.worldRarityPct || 30),
              0
            ) / myCollectedAll.length
          ).toFixed(1)
        : "0.0";

    return { totalPoints, avgRarity };
  }, [myCollectedAll]);

  // Native WoW macro (<255 chars, zero addons required)
  const inGameExportMacro = `/run local t,j={},C_MountJournal for _,m in next,j.GetMountIDs()do if select(11,j.GetMountInfoByID(m))then t[#t+1]=m end end local f=CreateFrame("EditBox",nil,UIParent,"InputBoxTemplate")f:SetAllPoints()f:SetText(table.concat(t,","))f:HighlightText()`;

  const simpleArmoryTabExtractorScript = `copy(JSON.stringify(angular.element(document.body).scope()?.$$childHead?.character?.mounts?.collected || []))`;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-emerald-500 text-slate-950 font-black text-xs px-4 py-3 rounded-2xl shadow-2xl border border-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#090e1a]/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Compass size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {tr("WoW Навигатор Маунтов", "WoW Mount Navigator")}
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  DataForAzeroth {Object.keys(DFA_RAW_COMPLETE_JSON).length}{" "}
                  {tr("маунтов", "mounts")}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {tr(
                  "Официальные названия ru.wowhead.com • Точные проценты Data for Azeroth • Маршруты с /way",
                  "Official Wowhead Names (EN/RU) • Verified Data for Azeroth Rarity • /way Map Pins"
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Крупный и заметный переключатель языка EN <-> RU */}
            <div
              className="flex items-center bg-[#0b1324] border-2 border-amber-400 rounded-2xl p-1 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20"
              title={tr("Переключить язык сайта", "Switch website language")}
            >
              <button
                onClick={() => setLang("en")}
                className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                  lang === "en"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <span>🇬🇧</span>
                <span>English</span>
              </button>
              <button
                onClick={() => setLang("ru")}
                className={`px-3.5 py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1.5 ${
                  lang === "ru"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <span>🇷🇺</span>
                <span>Русский</span>
              </button>
            </div>

            <button
              onClick={() => setShowDfaImportModal((p) => !p)}
              className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
            >
              {tr(
                "📊 Обновить % с DataForAzeroth",
                "📊 Update DataForAzeroth %"
              )}
            </button>
            <div className="flex items-center bg-[#0e1525] border border-slate-700 rounded-xl p-0.5 text-xs font-extrabold">
              <button
                onClick={() => setAccountModeFilter("all")}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  accountModeFilter === "all"
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tr("🌐 Все", "🌐 All")}
              </button>
              <button
                onClick={() => setAccountModeFilter("trial")}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  accountModeFilter === "trial"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tr("🆓 Триал (≤20 ур.)", "🆓 Trial (≤Lv 20)")}
              </button>
              <button
                onClick={() => setAccountModeFilter("sub_only")}
                className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                  accountModeFilter === "sub_only"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tr("💳 Подписка", "💳 Sub Required")}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 space-y-4">
        {/* DataForAzeroth Import Modal */}
        {showDfaImportModal && (
          <section className="bg-[#0e172a] border-2 border-sky-500/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-sky-300">
                {tr(
                  "📊 Обновление процентов редкости с Data for Azeroth",
                  "📊 Update Rarity Percentages from Data for Azeroth"
                )}
              </h3>
              <button
                onClick={() => setShowDfaImportModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              {tr(
                `В трекер уже вшита база из ${
                  Object.keys(DFA_RAW_COMPLETE_JSON).length
                } маунтов с Data for Azeroth. Если вышли новые маунты, вставь JSON или скопированный текст со страницы Data for Azeroth ниже:`,
                `The tracker already includes ${
                  Object.keys(DFA_RAW_COMPLETE_JSON).length
                } verified mounts from Data for Azeroth. Paste updated JSON or copied page text below:`
              )}
            </p>
            <textarea
              value={dfaPasteText}
              onChange={(e) => setDfaPasteText(e.target.value)}
              placeholder={tr(
                'Вставь JSON вида {"Wildseed Cradle":"32%"} или скопированный текст страницы Data for Azeroth...',
                'Paste JSON like {"Wildseed Cradle":"32%"} or copied text from Data for Azeroth...'
              )}
              className="w-full h-24 bg-[#070b14] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleImportDfaText}
                className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs cursor-pointer"
              >
                {tr("Применить проценты", "Apply Percentages")}
              </button>
            </div>
          </section>
        )}

        {/* 1-CLICK SIMPLEARMORY LOGIN & SYNC BAR */}
        <section className="bg-[#0e1525] border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-amber-400" />
              <h2 className="text-sm font-black text-white">
                {tr(
                  "Подключение коллекции персонажа (SimpleArmory / Игровой макрос WoW без аддонов)",
                  "Connect Character Collection (SimpleArmory / Addon-Free In-Game WoW Macro)"
                )}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                {tr("Собрано в коллекции:", "Collected:")}{" "}
                <strong className="text-emerald-400">
                  {myCollectedAll.length}
                </strong>{" "}
                / {allMounts.length}
              </span>
              <span className="text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">
                {tr("💾 Автосохранение активно", "💾 Auto-Save Active")}
              </span>
              <button
                onClick={handleExportSiteBackup}
                className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 font-bold cursor-pointer flex items-center gap-1"
                title={tr(
                  "Скачать резервную копию своей коллекции, целей и настроек в файл .json",
                  "Download a backup of your collection, goals, and settings as a .json file"
                )}
              >
                {tr("💾 Скачать бэкап", "💾 Export Backup")}
              </button>
              <label
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold cursor-pointer flex items-center gap-1"
                title={tr(
                  "Восстановить коллекцию и настройки из сохраненного файла .json",
                  "Restore collection and settings from a saved .json backup file"
                )}
              >
                {tr("📂 Загрузить бэкап", "📂 Import Backup")}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSiteBackup}
                  className="hidden"
                />
              </label>
              {myCollectedAll.length > 0 && (
                <button
                  onClick={handleClearCollection}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 font-bold cursor-pointer flex items-center gap-1"
                  title={tr(
                    "Сбросить отмеченные и импортированные маунты",
                    "Clear all marked and imported mounts"
                  )}
                >
                  <Trash2 size={12} />{" "}
                  {tr("Сбросить коллекцию", "Reset Collection")}
                </button>
              )}
              <button
                onClick={() =>
                  copyToClipboard(
                    inGameExportMacro,
                    tr(
                      "📋 Макрос (без аддонов!) скопирован! Вставь в чат WoW -> нажми Ctrl+C -> вставь (Ctrl+V) в поле ниже!",
                      "📋 WoW Macro copied! Paste into WoW chat -> press Ctrl+C -> paste (Ctrl+V) into the box below!"
                    )
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-extrabold cursor-pointer flex items-center gap-1"
              >
                <Terminal size={13} />{" "}
                {tr(
                  "1. Скопировать макрос для WoW (Без аддонов)",
                  "1. Copy WoW Macro (No Addons)"
                )}
              </button>
              <button
                onClick={() => setShowConnectHelperModal((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-200 font-extrabold cursor-pointer flex items-center gap-1"
              >
                <Sparkles size={13} />{" "}
                {tr(
                  "Инструкция по подключению (3 способа)",
                  "Connection Guide (3 Methods)"
                )}
              </button>
            </div>
          </div>

          {/* Панель периодического авто-обновления коллекции */}
          <div className="bg-[#090d16] border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAutoSyncEnabled((p) => !p)}
                className={`px-2.5 py-1 rounded-lg font-extrabold cursor-pointer flex items-center gap-1.5 border ${
                  autoSyncEnabled
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                <RefreshCw
                  size={12}
                  className={isSyncingSa ? "animate-spin" : ""}
                />
                {autoSyncEnabled
                  ? tr(
                      "Авто-обновление коллекции: ВКЛ",
                      "Auto-Sync Collection: ON"
                    )
                  : tr(
                      "Авто-обновление коллекции: ВЫКЛ",
                      "Auto-Sync Collection: OFF"
                    )}
              </button>
              {autoSyncEnabled && (
                <select
                  value={autoSyncIntervalMin}
                  onChange={(e) =>
                    setAutoSyncIntervalMin(Number(e.target.value) || 5)
                  }
                  className="bg-[#0e1525] border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200"
                >
                  <option value={2}>
                    {tr(
                      "Каждые 2 мин + при возврате на вкладку",
                      "Every 2 min + on tab focus"
                    )}
                  </option>
                  <option value={5}>
                    {tr(
                      "Каждые 5 мин + при возврате на вкладку",
                      "Every 5 min + on tab focus"
                    )}
                  </option>
                  <option value={15}>
                    {tr(
                      "Каждые 15 мин + при возврате на вкладку",
                      "Every 15 min + on tab focus"
                    )}
                  </option>
                  <option value={30}>
                    {tr(
                      "Каждые 30 мин + при возврате на вкладку",
                      "Every 30 min + on tab focus"
                    )}
                  </option>
                </select>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {lastSyncTimeStr ? (
                <span>
                  {tr("Последняя проверка:", "Last checked:")}{" "}
                  <strong className="text-emerald-300">
                    {lastSyncTimeStr}
                  </strong>
                </span>
              ) : (
                <span>
                  {tr(
                    "Введи сервер и персонажа — коллекция будет обновляться сама",
                    "Enter realm & character — collection will auto-sync periodically"
                  )}
                </span>
              )}
              {saRealm.trim() && saChar.trim() && (
                <button
                  onClick={() =>
                    handleOneClickSimpleArmorySync("", {
                      silent: false,
                      merge: true,
                    })
                  }
                  disabled={isSyncingSa}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold cursor-pointer"
                >
                  {tr("Проверить сейчас", "Sync Now")}
                </button>
              )}
            </div>
          </div>

          {showConnectHelperModal && (
            <div className="bg-[#090e1a] border border-amber-500/40 rounded-xl p-3 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Method 1 */}
                <div className="bg-[#090d16] border border-emerald-500/50 rounded-xl p-3 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-black text-emerald-300">
                      {tr(
                        "✅ Способ 1 (100% точность, даже для триала):",
                        "✅ Method 1 (100% Accuracy, Works on Trial Too):"
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {tr(
                        "Нажми кнопку ниже, вставь макрос в чат WoW и нажми Enter — откроется окно со списком ID всех твоих маунтов. Нажми Ctrl+C и вставь (Ctrl+V) в поле ниже!",
                        "Click the button below, paste the macro into WoW chat and press Enter — a window with all your Mount IDs will appear. Press Ctrl+C and paste (Ctrl+V) into the field below!"
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        inGameExportMacro,
                        tr(
                          "📋 Макрос скопирован! Вставь в чат WoW -> Ctrl+C -> Ctrl+V в поле ниже!",
                          "📋 Macro copied! Paste into WoW chat -> Ctrl+C -> Ctrl+V into the field below!"
                        )
                      )
                    }
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Copy size={13} />{" "}
                    {tr("Скопировать макрос WoW", "Copy In-Game WoW Macro")}
                  </button>
                </div>

                {/* Method 2 */}
                <div className="bg-[#090d16] border border-amber-500/50 rounded-xl p-3 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-black text-amber-300">
                      {tr(
                        "🌐 Способ 2 (Через JSON SimpleArmory):",
                        "🌐 Method 2 (Via SimpleArmory JSON):"
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {tr(
                        "Если браузер блокирует прямой запрос к SimpleArmory, открой JSON своего персонажа по кнопке ниже, нажми Ctrl+A → Ctrl+C и вставь сюда!",
                        "If your browser blocks direct requests to SimpleArmory, open your character JSON below, press Ctrl+A → Ctrl+C, and paste it here!"
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={`https://armorystats.info/${saRegion}/${normalizeRealmSlug(
                        saRealm || "gordunni"
                      )}/${encodeURIComponent(
                        (saChar || "character").trim().toLowerCase()
                      )}/collections/mounts`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />{" "}
                      {tr(
                        "Открыть JSON SimpleArmory",
                        "Open SimpleArmory JSON"
                      )}{" "}
                      {saChar ? `(${saChar})` : ""}
                    </a>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          simpleArmoryTabExtractorScript,
                          tr(
                            "📋 Скрипт для вкладки SimpleArmory скопирован! На сайте SimpleArmory нажми F12 -> Console -> вставь -> Enter, затем Ctrl+V сюда!",
                            "📋 SimpleArmory console script copied! On SimpleArmory press F12 -> Console -> paste -> Enter, then Ctrl+V here!"
                          )
                        )
                      }
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-200 font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Copy size={12} />{" "}
                      {tr(
                        "Или скрипт для F12 на SimpleArmory",
                        "Or Copy F12 Script for SimpleArmory"
                      )}
                    </button>
                  </div>
                </div>

                {/* Method 3 */}
                <div className="bg-[#090d16] border border-purple-500/50 rounded-xl p-3 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-black text-purple-300">
                      {tr(
                        "⚡ Способ 3 (Ссылка на SimpleArmory):",
                        "⚡ Method 3 (SimpleArmory Profile Link):"
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {tr(
                        "Вставь прямую ссылку на свой профиль SimpleArmory в поле быстрого импорта ниже — регион, сервер и имя персонажа подставятся автоматически.",
                        "Paste your direct SimpleArmory profile URL into the quick import field below — region, realm, and character name will auto-fill."
                      )}
                    </p>
                  </div>
                  <a
                    href="https://simplearmory.com"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} />{" "}
                    {tr("Открыть SimpleArmory.com", "Open SimpleArmory.com")}
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <select
              value={saRegion}
              onChange={(e) => setSaRegion(e.target.value)}
              className="sm:col-span-2 bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
            >
              <option value="eu">{tr("EU (Европа)", "EU (Europe)")}</option>
              <option value="us">{tr("US (Америка)", "US (Americas)")}</option>
              <option value="kr">{tr("KR (Корея)", "KR (Korea)")}</option>
              <option value="tw">{tr("TW (Тайвань)", "TW (Taiwan)")}</option>
            </select>

            <div className="sm:col-span-4 flex gap-1">
              <input
                type="text"
                list="wow-realms-list"
                value={saRealm}
                onChange={(e) => setSaRealm(e.target.value)}
                placeholder={tr(
                  "Сервер (напр. Гордунни / Ревущий фьорд)",
                  "Realm (e.g. Silvermoon / Draenor / Gordunni)"
                )}
                className="w-full bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500"
              />
              <datalist id="wow-realms-list">
                {REALM_PRESETS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {lang === "en" ? r.nameEn : r.nameRu}
                  </option>
                ))}
              </datalist>
            </div>

            <input
              type="text"
              value={saChar}
              onChange={(e) => setSaChar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleOneClickSimpleArmorySync();
              }}
              placeholder={tr("Имя персонажа", "Character Name")}
              className="sm:col-span-3 bg-[#090d16] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500"
            />

            <button
              onClick={() => handleOneClickSimpleArmorySync()}
              disabled={isSyncingSa}
              className="sm:col-span-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl px-3 py-2 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Zap size={14} />
              {isSyncingSa
                ? tr("Загрузка...", "Syncing...")
                : saChar.trim()
                ? `${tr("Подключить", "Connect")} (${saChar.trim()})`
                : tr("Подключить SimpleArmory", "Connect SimpleArmory")}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={importInputText}
              onChange={(e) => setImportInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && importInputText.trim()) {
                  handleOneClickSimpleArmorySync(importInputText);
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted && pasted.length > 2) {
                  setTimeout(() => handleOneClickSimpleArmorySync(pasted), 40);
                }
              }}
              placeholder={tr(
                "Вставь сюда (Ctrl+V) список ID из макроса WoW, JSON из F12 или ссылку SimpleArmory — подключится мгновенно!",
                "Paste (Ctrl+V) WoW macro Mount IDs, SimpleArmory JSON, or SimpleArmory URL here for instant sync!"
              )}
              className="flex-1 bg-[#090d16] border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            {importInputText.trim() && (
              <button
                onClick={() => handleOneClickSimpleArmorySync(importInputText)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shrink-0"
              >
                {tr("Подключить список", "Import List")}
              </button>
            )}
            {saChar.trim() && saRealm.trim() && (
              <a
                href={`https://simplearmory.com/#/${saRegion}/${normalizeRealmSlug(
                  saRealm
                )}/${encodeURIComponent(saChar.trim())}/collectable/mounts`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 shrink-0"
              >
                {tr("Профиль SimpleArmory", "SimpleArmory Profile")}{" "}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>

        {/* Top-3 Fast Recommendations */}
        {top3Recommendations.length > 0 && activeTab === "available" && (
          <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  {tr(
                    "Топ-3 самые быстрые цели прямо сейчас (0 репутации, 100% получение)",
                    "Top 3 Quickest Mounts Right Now (0 Reputation, 100% Guaranteed)"
                  )}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3Recommendations.map((m, idx) => {
                const { primary, secondary } = getMountTitles(m);
                const locZone = getLocalizedMountField(m, "zone", lang);
                const locPinLabel = getLocalizedMountField(m, "pinLabel", lang);
                const locWay = getLocalizedMountField(m, "waypoint", lang);
                const locPinMacro = getLocalizedMountField(
                  m,
                  "blizzardPinMacro",
                  lang
                );
                return (
                  <div
                    key={m.id}
                    className="bg-[#0b111e] border border-slate-800 rounded-xl p-3 flex items-start gap-3"
                  >
                    <img
                      src={m.iconUrl}
                      alt={primary}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_MOUNT_ICON;
                      }}
                      className="w-11 h-11 rounded-xl border border-amber-400/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                          #{idx + 1}
                        </span>
                        <h3 className="text-xs font-black text-white truncate">
                          {primary}
                        </h3>
                      </div>
                      {secondary && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {secondary}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-300 truncate mt-0.5">
                        {locZone}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] font-bold">
                        {m.difficultyBadge && (
                          <span
                            title={
                              lang === "en"
                                ? m.difficultyBadge.titleEn
                                : m.difficultyBadge.title
                            }
                            className={`px-2 py-0.5 rounded font-extrabold ${m.difficultyBadge.badgeClass}`}
                          >
                            {lang === "en"
                              ? m.difficultyBadge.labelEn
                              : m.difficultyBadge.label}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                          📊 {tr("У игроков:", "Owned:")} {m.worldRarityDisplay}
                        </span>
                        {locPinMacro && (
                          <button
                            onClick={() =>
                              copyToClipboard(
                                locPinMacro,
                                tr(
                                  `📌 Булавка скопирована! Вставь в чат WoW — на карте появится метка (${locPinLabel})`,
                                  `📌 Map Pin copied! Paste into WoW chat to set waypoint (${locPinLabel})`
                                )
                              )
                            }
                            className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 hover:bg-amber-300 font-black cursor-pointer flex items-center gap-1"
                          >
                            <MapPin size={10} />{" "}
                            {tr("📌 Булавка", "📌 Map Pin")}
                          </button>
                        )}
                        {locWay && (
                          <button
                            onClick={() =>
                              copyToClipboard(
                                locWay,
                                `${tr("Скопировано:", "Copied:")} ${locWay}`
                              )
                            }
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 cursor-pointer flex items-center gap-1"
                          >
                            <Copy size={10} /> /way
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("available")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
              activeTab === "available"
                ? "bg-amber-400 text-slate-950 shadow-lg"
                : "bg-[#0e1525] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Compass size={15} /> {tr("Доступные маунты", "Available Mounts")} (
            {allMounts.filter((m) => !m.isCollected).length})
          </button>

          <button
            onClick={() => setActiveTab("goals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
              activeTab === "goals"
                ? "bg-amber-400 text-slate-950 shadow-lg"
                : "bg-[#0e1525] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Target size={15} /> {tr("🎯 Мои цели", "🎯 My Goals")} (
            {goalIds.length})
          </button>

          <button
            onClick={() => setActiveTab("sprint")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
              activeTab === "sprint"
                ? "bg-sky-400 text-slate-950 shadow-lg"
                : "bg-[#0e1525] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Zap size={15} /> {tr("⚡ Спринт-маршрут", "⚡ Sprint Route")} (
            {sprintRouteData.picked.length})
          </button>

          <button
            onClick={() => setActiveTab("alts")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
              activeTab === "alts"
                ? "bg-purple-400 text-slate-950 shadow-lg"
                : "bg-[#0e1525] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Sparkles size={15} />{" "}
            {tr("🧬 Нужна раса / Твинк", "🧬 Racial / Alt Unlocks")}
          </button>

          <button
            onClick={() => setActiveTab("collection")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer flex items-center gap-1.5 ${
              activeTab === "collection"
                ? "bg-emerald-400 text-slate-950 shadow-lg"
                : "bg-[#0e1525] text-slate-300 hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Trophy size={15} />{" "}
            {tr("🏆 Моя коллекция и Престиж", "🏆 My Collection & Prestige")} (
            {myCollectedAll.length})
          </button>
        </div>

        {/* TAB: SPRINT ROUTE BUILDER */}
        {activeTab === "sprint" ? (
          <section className="space-y-4">
            <div className="bg-[#0e1525] border border-sky-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <Zap size={18} className="text-sky-400" />
                    {tr(
                      "Генератор спринт-маршрута (100% гарантия без репутации и без КД)",
                      "Sprint Route Builder (100% Guaranteed Solo Mounts, 0 Reputation)"
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr(
                      "Выбери, сколько у тебя свободного времени прямо сейчас — алгоритм соберёт самые быстрые неполученные маунты со 100% шансом.",
                      "Choose your available playtime — the algorithm builds the fastest route of uncollected 100% guaranteed mounts."
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[30, 60, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSprintBudgetMinutes(mins)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                        sprintBudgetMinutes === mins
                          ? "bg-sky-400 text-slate-950 border-sky-300"
                          : "bg-[#090d16] text-slate-300 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      ⏱ {tr(`На ${mins} мин`, `${mins} min`)}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      copyBatchWaypoints(
                        sprintRouteData.picked,
                        tr("Спринт-маршрут", "Sprint Route")
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Copy size={13} />{" "}
                    {tr("Скопировать все /way маршрута", "Copy All Route /way")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 font-bold">
                    {tr("Маунтов за забег", "Mounts in Run")}
                  </span>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    +{sprintRouteData.picked.length} {tr("шт.", "mounts")}
                  </div>
                </div>
                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 font-bold">
                    {tr("Общее время маршрута", "Estimated Route Time")}
                  </span>
                  <div className="text-xl font-black text-sky-400 mt-0.5">
                    ~{sprintRouteData.usedMinutes} {tr("мин", "min")}
                  </div>
                </div>
                <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 font-bold">
                    {tr("Прирост индекса престижа", "Prestige Score Gain")}
                  </span>
                  <div className="text-xl font-black text-amber-400 mt-0.5">
                    +{sprintRouteData.totalPrestigeGain} {tr("очков", "pts")}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {sprintRouteData.picked.map((mount, idx) => {
                const { primary, secondary } = getMountTitles(mount);
                const locZone = getLocalizedMountField(mount, "zone", lang);
                const locReq = getLocalizedMountField(
                  mount,
                  "requirements",
                  lang
                );
                const locSummary = getLocalizedMountField(
                  mount,
                  "summary",
                  lang
                );
                const locPinLabel = getLocalizedMountField(
                  mount,
                  "pinLabel",
                  lang
                );
                const locWay = getLocalizedMountField(mount, "waypoint", lang);
                const locPinMacro = getLocalizedMountField(
                  mount,
                  "blizzardPinMacro",
                  lang
                );
                return (
                  <div
                    key={mount.id}
                    className="bg-[#0e1525] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-1">
                        {tr(`Шаг ${idx + 1}`, `#${idx + 1}`)}
                      </div>
                      <img
                        src={mount.iconUrl}
                        alt={primary}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_MOUNT_ICON;
                        }}
                        className="w-12 h-12 rounded-xl border border-slate-700 shrink-0 bg-slate-900"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-white">
                            {primary}
                          </h3>
                          {secondary && (
                            <span className="text-xs text-slate-400">
                              ({secondary})
                            </span>
                          )}
                          {mount.difficultyBadge && (
                            <span
                              title={
                                lang === "en"
                                  ? mount.difficultyBadge.titleEn
                                  : mount.difficultyBadge.title
                              }
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${mount.difficultyBadge.badgeClass}`}
                            >
                              {lang === "en"
                                ? mount.difficultyBadge.labelEn
                                : mount.difficultyBadge.label}
                            </span>
                          )}
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            📊 {tr("У игроков:", "Owned:")}{" "}
                            {mount.worldRarityDisplay}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-semibold mt-0.5">
                          {getLocalizedMountField(mount, "expansion", lang)} •{" "}
                          {locZone}
                        </p>
                        {locReq && (
                          <div className="mt-1 bg-[#090d16] border border-amber-500/30 rounded-lg px-2.5 py-1 text-[11px] text-amber-200 font-semibold">
                            📋 {tr("Требования:", "Requirements:")} {locReq}
                          </div>
                        )}
                        <p className="text-xs text-slate-200 mt-1">
                          {locSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                      {locPinMacro && (
                        <button
                          onClick={() =>
                            copyToClipboard(
                              locPinMacro,
                              tr(
                                `📌 Булавка скопирована! Вставь в чат WoW (${locPinLabel})`,
                                `📌 Map Pin copied! Paste into WoW chat (${locPinLabel})`
                              )
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1"
                        >
                          <MapPin size={13} /> {tr("📌 Булавка", "📌 Map Pin")}
                        </button>
                      )}
                      {locWay && (
                        <button
                          onClick={() =>
                            copyToClipboard(
                              locWay,
                              `${tr("Скопировано:", "Copied:")} ${locWay}`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Copy size={12} /> /way
                        </button>
                      )}
                      <button
                        onClick={() => toggleCollected(mount)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check size={13} /> {tr("Получено", "Collected")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : activeTab === "alts" ? (
          /* TAB: RACE & ALT UNLOCK PLANNER */
          <section className="space-y-4">
            <div className="bg-[#0e1525] border border-purple-500/40 rounded-2xl p-4">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                {tr(
                  "Быстрое пополнение коллекции через расовых торговцев и твинков (Орда и Альянс)",
                  "Fast Collection Boost via Capital Racial Vendors & Class Alts (Horde & Alliance)"
                )}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {tr(
                  "Все расовые и классовые маунты мгновенно идут в общий счётчик достижений на аккаунте (50 / 100 / 200 / 300 маунтов). Даже на триале можно создать персонажа 10 уровня другой расы/фракции и за 2 минуты скупить всех базовых маунтов столицы за несколько золотых!",
                  "All racial and class mounts count toward account-wide collection achievements (50 / 100 / 200 / 300+ mounts). Even on a Trial account, you can create a level 10 alt of another race/faction and buy all capital vendor mounts in 2 minutes!"
                )}
              </p>
            </div>

            {altUnlocksByGroup.map((group) => (
              <div
                key={group.id}
                className="bg-[#0b111e] border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {group.title}
                    </h3>
                    <p className="text-xs text-slate-400">{group.subtitle}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black">
                    {tr("Доступно:", "Available:")} {group.mounts.length}{" "}
                    {tr("шт.", "mounts")}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.mounts.map((mount) => {
                    const { primary, secondary } = getMountTitles(mount);
                    const locPinLabel = getLocalizedMountField(
                      mount,
                      "pinLabel",
                      lang
                    );
                    const locReq = getLocalizedMountField(
                      mount,
                      "requirements",
                      lang
                    );
                    const locSummary = getLocalizedMountField(
                      mount,
                      "summary",
                      lang
                    );
                    const locWay = getLocalizedMountField(
                      mount,
                      "waypoint",
                      lang
                    );
                    const locPinMacro = getLocalizedMountField(
                      mount,
                      "blizzardPinMacro",
                      lang
                    );
                    return (
                      <div
                        key={mount.id}
                        className="bg-[#0e1525] border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5"
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={mount.iconUrl}
                            alt={primary}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_MOUNT_ICON;
                            }}
                            className="w-11 h-11 rounded-xl border border-slate-700 shrink-0 bg-slate-900"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-white truncate">
                              {primary}
                            </h4>
                            {secondary && (
                              <p className="text-[11px] text-slate-400 truncate">
                                {secondary}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {mount.difficultyBadge && (
                                <span
                                  title={
                                    lang === "en"
                                      ? mount.difficultyBadge.titleEn
                                      : mount.difficultyBadge.title
                                  }
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${mount.difficultyBadge.badgeClass}`}
                                >
                                  {lang === "en"
                                    ? mount.difficultyBadge.labelEn
                                    : mount.difficultyBadge.label}
                                </span>
                              )}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                                📊 {mount.worldRarityDisplay}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 truncate">
                                {locPinLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {locReq && (
                          <div className="bg-[#090d16] border border-purple-500/30 rounded-lg px-2.5 py-1 text-[11px] text-purple-200 font-medium">
                            📋 {locReq}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {locSummary}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                          <div className="flex items-center gap-1">
                            {locPinMacro && (
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    locPinMacro,
                                    tr(
                                      `📌 Булавка скопирована! Вставь в чат WoW (${locPinLabel})`,
                                      `📌 Map Pin copied! Paste into WoW chat (${locPinLabel})`
                                    )
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] cursor-pointer flex items-center gap-1"
                              >
                                <MapPin size={11} /> {tr("Булавка", "Map Pin")}
                              </button>
                            )}
                            {locWay && (
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    locWay,
                                    `${tr("Скопировано:", "Copied:")} ${locWay}`
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold text-[11px] cursor-pointer"
                              >
                                /way
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => toggleCollected(mount)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] cursor-pointer flex items-center gap-1"
                          >
                            <Check size={12} /> {tr("Получено", "Collected")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        ) : activeTab === "collection" ? (
          /* TAB: MY COLLECTION & PRESTIGE */
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#0e1525] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold">
                  {tr("Всего собрано маунтов", "Total Collected Mounts")}
                </span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {myCollectedAll.length} {tr("шт.", "mounts")}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {tr(
                    "Отображаются все маунты твоего профиля с русскими и английскими названиями",
                    "Showing all mounts in your profile with official English and Russian names"
                  )}
                </p>
              </div>

              <div className="bg-[#0e1525] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold">
                  {tr("Индекс престижа коллекции", "Collection Prestige Score")}
                </span>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {prestigeStats.totalPoints} {tr("очков", "pts")}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {tr(
                    "Чем ниже % владения у маунта по Data for Azeroth, тем больше очков престижа",
                    "Lower Data for Azeroth ownership % grants higher prestige points"
                  )}
                </p>
              </div>

              <div className="bg-[#0e1525] border border-slate-800 rounded-2xl p-4">
                <span className="text-xs text-slate-400 font-bold">
                  {tr(
                    "Средняя редкость (DataForAzeroth)",
                    "Average Rarity (DataForAzeroth)"
                  )}
                </span>
                <div className="text-2xl font-black text-sky-400 mt-1">
                  {prestigeStats.avgRarity}%
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {tr(
                    "Отсортировано от самых редких маунтов твоей коллекции к более частым",
                    "Sorted from your rarest collected mounts to most common"
                  )}
                </p>
              </div>
            </div>

            {/* Mount Collection Achievement Progress Bar */}
            <div className="bg-[#0e1525] border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-amber-400" />
                  <span className="font-black text-white">
                    {tr(
                      "Прогресс достижений коллекционера:",
                      "Collector Achievement Progress:"
                    )}{" "}
                    «
                    {lang === "en"
                      ? achievementMilestones.nextTier.titleEn
                      : achievementMilestones.nextTier.titleRu}
                    » ({achievementMilestones.current} /{" "}
                    {achievementMilestones.nextTier.count})
                  </span>
                </div>
                <span className="text-amber-300 font-bold">
                  {achievementMilestones.remaining > 0
                    ? tr(
                        `Осталось ${achievementMilestones.remaining} шт. → Награда: ${achievementMilestones.nextTier.rewardRu}`,
                        `${achievementMilestones.remaining} more needed → Reward: ${achievementMilestones.nextTier.rewardEn}`
                      )
                    : tr(
                        "🎉 Все ключевые вехи закрыты!",
                        "🎉 All major milestones completed!"
                      )}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#090d16] rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${achievementMilestones.pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {achievementMilestones.tiers.map((t) => {
                  const done = achievementMilestones.current >= t.count;
                  const tTitle = lang === "en" ? t.titleEn : t.titleRu;
                  const tReward = lang === "en" ? t.rewardEn : t.rewardRu;
                  return (
                    <span
                      key={t.count}
                      title={`${tTitle} — ${tReward}`}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                        done
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-[#090d16] text-slate-400 border-slate-800"
                      }`}
                    >
                      {done ? "✓" : "○"} {t.count} {tr("маунтов", "mounts")} (
                      {tReward})
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Search & Rarity Filter inside My Collection */}
            {myCollectedAll.length > 0 && (
              <div className="bg-[#0e1525] border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder={tr(
                      "Поиск внутри твоей коллекции (по русскому или английскому названию)...",
                      "Search inside your collection (by English or Russian name)..."
                    )}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={collectionRarityFilter}
                    onChange={(e) => setCollectionRarityFilter(e.target.value)}
                    className="bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200"
                  >
                    <option value="all">
                      {tr("Все по редкости", "All Rarities")} (
                      {myCollectedAll.length})
                    </option>
                    <option value="ultra">
                      {tr("🔥 Ультра-редкие (<5%)", "🔥 Ultra Rare (<5%)")}
                    </option>
                    <option value="rare">
                      {tr("💎 Редкие (≤15%)", "💎 Rare (≤15%)")}
                    </option>
                    <option value="uncommon">
                      {tr("✨ Необычные (≤35%)", "✨ Uncommon (≤35%)")}
                    </option>
                  </select>
                  <select
                    value={collectionSortBy}
                    onChange={(e) => setCollectionSortBy(e.target.value)}
                    className="bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-200"
                  >
                    <option value="rarest">
                      {tr("Сначала самые редкие (%)", "Rarest First (%)")}
                    </option>
                    <option value="common">
                      {tr("Сначала самые частые (%)", "Most Common First (%)")}
                    </option>
                    <option value="alpha">
                      {tr("По алфавиту (А–Я)", "Alphabetical (A–Z)")}
                    </option>
                  </select>
                </div>
              </div>
            )}

            {myCollectedAll.length === 0 ? (
              <div className="bg-[#0e1525] border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <Trophy size={32} className="text-slate-500 mx-auto" />
                <h3 className="text-sm font-black text-white">
                  {tr(
                    "Твоя коллекция пока не подключена",
                    "Your Collection Is Empty"
                  )}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  {tr(
                    "Введи свой сервер и имя персонажа в панели SimpleArmory выше, вставь список ID из игрового макроса WoW или отметь собранных маунтов вручную в каталоге.",
                    "Enter your realm and character name in the SimpleArmory panel above, paste Mount IDs from the in-game WoW macro, or mark mounts manually in the catalog."
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMyCollection.map((mount, idx) => {
                  const { primary, secondary } = getMountTitles(mount);
                  const locExp = getLocalizedMountField(
                    mount,
                    "expansion",
                    lang
                  );
                  const locReq = getLocalizedMountField(
                    mount,
                    "requirements",
                    lang
                  );
                  const locSummary = getLocalizedMountField(
                    mount,
                    "summary",
                    lang
                  );
                  const locPinLabel = getLocalizedMountField(
                    mount,
                    "pinLabel",
                    lang
                  );
                  const locWay = getLocalizedMountField(
                    mount,
                    "waypoint",
                    lang
                  );
                  const locPinMacro = getLocalizedMountField(
                    mount,
                    "blizzardPinMacro",
                    lang
                  );
                  return (
                    <div
                      key={mount.id}
                      className="bg-[#0e1525] border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={mount.iconUrl}
                          alt={primary}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_MOUNT_ICON;
                          }}
                          className="w-12 h-12 rounded-xl border border-emerald-500/40 shrink-0 bg-slate-900"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              #{idx + 1}
                            </span>
                            <h3 className="text-sm font-black text-white leading-snug truncate">
                              {primary}
                            </h3>
                          </div>
                          {secondary && (
                            <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                              {secondary}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {mount.difficultyBadge && (
                              <span
                                title={
                                  lang === "en"
                                    ? mount.difficultyBadge.titleEn
                                    : mount.difficultyBadge.title
                                }
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${mount.difficultyBadge.badgeClass}`}
                              >
                                {lang === "en"
                                  ? mount.difficultyBadge.labelEn
                                  : mount.difficultyBadge.label}
                              </span>
                            )}
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              📊 {tr("У игроков:", "Owned:")}{" "}
                              {mount.worldRarityDisplay}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                              {locExp}
                            </span>
                          </div>
                        </div>
                      </div>

                      {locReq && (
                        <div className="bg-[#090d16] border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-200 font-medium">
                          📋{" "}
                          <strong>{tr("Требования:", "Requirements:")}</strong>{" "}
                          {locReq}
                        </div>
                      )}
                      {locSummary && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {locSummary}
                        </p>
                      )}

                      {locWay && (
                        <div className="bg-[#090d16] border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                          <span
                            className="text-slate-300 truncate"
                            title={locWay}
                          >
                            📍 {locPinLabel}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  locPinMacro,
                                  tr(
                                    `📌 Булавка на карту скопирована! Вставь в чат WoW (${locPinLabel})`,
                                    `📌 Map Pin copied! Paste into WoW chat (${locPinLabel})`
                                  )
                                )
                              }
                              className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer flex items-center gap-1"
                              title={tr(
                                "Поставить стандартную булавку Blizzard на карту в игре (без аддонов)",
                                "Set standard Blizzard map pin in-game (no addons required)"
                              )}
                            >
                              <MapPin size={11} /> {tr("Булавка", "Map Pin")}
                            </button>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  locWay,
                                  `${tr(
                                    "Скопировано для TomTom:",
                                    "Copied for TomTom:"
                                  )} ${locWay}`
                                )
                              }
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold cursor-pointer flex items-center gap-1"
                              title={tr(
                                "Скопировать команду /way для аддона TomTom",
                                "Copy /way command for TomTom addon"
                              )}
                            >
                              <Copy size={10} /> /way
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <a
                            href={
                              mount.spellId
                                ? `https://www.wowhead.com/${
                                    lang === "en" ? "" : "ru/"
                                  }spell=${mount.spellId}`
                                : `https://www.wowhead.com/${
                                    lang === "en" ? "" : "ru/"
                                  }search?q=${encodeURIComponent(
                                    mount.nameEn || mount.nameRu
                                  )}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
                          >
                            Wowhead <ExternalLink size={11} />
                          </a>
                          <a
                            href={`https://www.dataforazeroth.com/collections/mounts`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-300 hover:text-sky-200 font-bold flex items-center gap-1"
                          >
                            📊 DfA ({mount.worldRarityDisplay})
                          </a>
                        </div>

                        <button
                          onClick={() => toggleCollected(mount)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 font-bold text-[11px] cursor-pointer"
                        >
                          {tr("✓ В коллекции", "✓ Collected")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* TAB: AVAILABLE MOUNTS & GOALS */
          <section className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-[#0e1525] border border-slate-800 rounded-2xl p-3.5 space-y-3">
              {/* Prominent Trial / Subscription Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    size={15}
                    className="text-emerald-400 shrink-0"
                  />
                  <span className="text-xs font-black text-white">
                    {tr(
                      "Фильтр аккаунта (Триал / Подписка):",
                      "Account Mode Filter (Trial / Subscription):"
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setAccountModeFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                      accountModeFilter === "all"
                        ? "bg-sky-400 text-slate-950 border-sky-300 shadow"
                        : "bg-[#090d16] text-slate-300 border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    {tr("🌐 Все маунты", "🌐 All Mounts")} (
                    {allMounts.filter((m) => !m.isCollected).length})
                  </button>
                  <button
                    onClick={() => setAccountModeFilter("trial")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                      accountModeFilter === "trial"
                        ? "bg-emerald-400 text-slate-950 border-emerald-300 shadow"
                        : "bg-[#090d16] text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
                    }`}
                  >
                    {tr(
                      "🆓 Доступно на Триале ≤20 ур.",
                      "🆓 Free Trial Compatible ≤Lv 20"
                    )}{" "}
                    (
                    {
                      allMounts.filter(
                        (m) => !m.isCollected && m.trialCompatible
                      ).length
                    }
                    )
                  </button>
                  <button
                    onClick={() => setAccountModeFilter("sub_only")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer border ${
                      accountModeFilter === "sub_only"
                        ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                        : "bg-[#090d16] text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                    }`}
                  >
                    {tr(
                      "💳 Требуется Подписка / Рейды",
                      "💳 Subscription / Raids Required"
                    )}{" "}
                    (
                    {
                      allMounts.filter(
                        (m) => !m.isCollected && !m.trialCompatible
                      ).length
                    }
                    )
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-5 relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tr(
                      "Поиск по русскому или английскому названию, локации...",
                      "Search by English or Russian mount name, zone, expansion..."
                    )}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="md:col-span-3 bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="all">
                    {tr("Все типы получения", "All Source Types")}
                  </option>
                  <option value="treasure">
                    {tr(
                      "🎁 Сокровище (100% без боя)",
                      "🎁 Treasure (100% No Combat)"
                    )}
                  </option>
                  <option value="puzzle">
                    {tr(
                      "🧩 Секрет / Головоломка (100%)",
                      "🧩 Secret / Puzzle (100%)"
                    )}
                  </option>
                  <option value="rare100">
                    {tr(
                      "⚔️ Редкий моб (100% дроп)",
                      "⚔️ Rare Spawn (100% Drop)"
                    )}
                  </option>
                  <option value="dungeon100">
                    {tr(
                      "🏰 Данж / Рейд (100% дроп)",
                      "🏰 Dungeon / Raid (100% Drop)"
                    )}
                  </option>
                  <option value="quest">
                    {tr("📜 Короткая цепочка квестов", "📜 Short Questline")}
                  </option>
                  <option value="vendor">
                    {tr(
                      "🪙 Базовые расовые торговцы",
                      "🪙 Capital Racial Vendors"
                    )}
                  </option>
                  <option value="reputation">
                    {tr("🏛️ Репутация / Известность", "🏛️ Reputation / Renown")}
                  </option>
                  <option value="dungeon">
                    {tr("🗝️ Подземелья (фарм)", "🗝️ Dungeons (Boss Drop)")}
                  </option>
                  <option value="raid">
                    {tr("🔥 Рейды (фарм)", "🔥 Raids (Boss Drop)")}
                  </option>
                </select>

                <select
                  value={repFilter}
                  onChange={(e) => setRepFilter(e.target.value)}
                  className="md:col-span-2 bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="all">
                    {tr("Любая репутация", "Any Reputation")}
                  </option>
                  <option value="norep">
                    {tr(
                      "⚡ Без репутации (0 репы)",
                      "⚡ Zero Reputation Required"
                    )}
                  </option>
                  <option value="rep">
                    {tr("🏛️ Нужна репутация", "🏛️ Requires Reputation")}
                  </option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="md:col-span-2 bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="fastest">
                    {tr(
                      "От простых (Серые → Золотые)",
                      "Easiest First (Gray → Gold)"
                    )}
                  </option>
                  <option value="hardest">
                    {tr(
                      "От сложных (Золотые → Серые)",
                      "Hardest First (Gold → Gray)"
                    )}
                  </option>
                  <option value="prestige_efficiency">
                    {tr("Макс. престиж к сложности", "Best Prestige / Effort")}
                  </option>
                  <option value="rarest">
                    {tr("Сначала редкие (%)", "Rarest First (%)")}
                  </option>
                  <option value="common">
                    {tr("Сначала частые (%)", "Most Common First (%)")}
                  </option>
                  <option value="alpha">
                    {tr("По алфавиту (А–Я)", "Alphabetical (A–Z)")}
                  </option>
                </select>
              </div>

              {/* Second Row of Power Filters: Expansion, Faction, Rarity Tier, Difficulty Color Gradation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <select
                  value={expansionFilter}
                  onChange={(e) => setExpansionFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="all">
                    {tr(
                      "🌍 Все дополнения / категории",
                      "🌍 All Expansions / Categories"
                    )}
                  </option>
                  {availableExpansions.map(([expName, count]) => (
                    <option key={expName} value={expName}>
                      {expName} ({count})
                    </option>
                  ))}
                </select>

                <select
                  value={factionFilter}
                  onChange={(e) => setFactionFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="all">
                    {tr("⚔️ Любая фракция", "⚔️ Any Faction")}
                  </option>
                  <option value="Horde">
                    {tr(
                      "🔴 Доступно Орде (Орда + Общие)",
                      "🔴 Available to Horde"
                    )}
                  </option>
                  <option value="Alliance">
                    {tr(
                      "🔵 Доступно Альянсу (Альянс + Общие)",
                      "🔵 Available to Alliance"
                    )}
                  </option>
                  <option value="Both">
                    {tr(
                      "⚪ Только общие для обеих фракций",
                      "⚪ Neutral / Cross-Faction Only"
                    )}
                  </option>
                </select>

                <select
                  value={rarityFilter}
                  onChange={(e) => setRarityFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="all">
                    {tr(
                      "📊 Любая редкость (DataForAzeroth)",
                      "📊 Any Rarity (DataForAzeroth)"
                    )}
                  </option>
                  <option value="ultra">
                    {tr(
                      "🔥 Ультра-редкие (<5% игроков)",
                      "🔥 Ultra Rare (<5% Owners)"
                    )}
                  </option>
                  <option value="rare">
                    {tr("💎 Редкие (≤15% игроков)", "💎 Rare (≤15% Owners)")}
                  </option>
                  <option value="uncommon">
                    {tr(
                      "✨ Необычные (≤35% игроков)",
                      "✨ Uncommon (≤35% Owners)"
                    )}
                  </option>
                  <option value="common">
                    {tr("🟢 Частые (>35% игроков)", "🟢 Common (>35% Owners)")}
                  </option>
                </select>

                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="bg-[#090d16] border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-200"
                >
                  <option value="all">
                    {tr(
                      "🎨 Любая сложность (Серый → Золотой)",
                      "🎨 Any Difficulty (Gray → Gold)"
                    )}
                  </option>
                  <option value="tier_1">
                    {tr(
                      "⚪ Серый — Просто купить у торговца",
                      "⚪ Gray — Easy Vendor Buy"
                    )}
                  </option>
                  <option value="tier_2">
                    {tr(
                      "🟢 Зелёный — Лёгкая 100% добыча",
                      "🟢 Green — Easy 100% Drop"
                    )}
                  </option>
                  <option value="tier_3">
                    {tr(
                      "🔵 Синий — Цепочки / Данжи / Секреты",
                      "🔵 Blue — Quests / Dungeons / Secrets"
                    )}
                  </option>
                  <option value="tier_4">
                    {tr(
                      "🟣 Фиолетовый — Репутация / Слава",
                      "🟣 Purple — Reputation / Glory"
                    )}
                  </option>
                  <option value="tier_5">
                    {tr(
                      "🟡 Золотой — Фарм рейдов (~1%) / Хардкор",
                      "🟡 Gold — Raid Farm (~1%) / Hardcore"
                    )}
                  </option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setOnlyOneTimeGuaranteed((p) => !p)}
                    className={`px-3 py-1 rounded-lg border font-bold cursor-pointer flex items-center gap-1 ${
                      onlyOneTimeGuaranteed
                        ? "bg-emerald-400 text-slate-950 border-emerald-300"
                        : "bg-slate-900 text-slate-300 border-slate-700"
                    }`}
                  >
                    {tr(
                      "💯 Только 100% разовая гарантия (без еженедельного рандома)",
                      "💯 100% Guaranteed Only (No Weekly RNG)"
                    )}
                  </button>
                  <button
                    onClick={() => setOnlyHiddenGems((p) => !p)}
                    className={`px-3 py-1 rounded-lg border font-bold cursor-pointer flex items-center gap-1 ${
                      onlyHiddenGems
                        ? "bg-purple-500 text-slate-950 border-purple-300"
                        : "bg-slate-900 text-slate-300 border-slate-700"
                    }`}
                  >
                    {tr(
                      "💎 Скрытые алмазы (<25% у игроков и ≤35 мин)",
                      "💎 Hidden Gems (<25% Owned & Fast)"
                    )}
                  </button>
                  <button
                    onClick={() => setGroupByZone((p) => !p)}
                    className={`px-3 py-1 rounded-lg border font-bold cursor-pointer flex items-center gap-1 ${
                      groupByZone
                        ? "bg-sky-400 text-slate-950 border-sky-300"
                        : "bg-slate-900 text-slate-300 border-slate-700"
                    }`}
                  >
                    <Layers size={13} />{" "}
                    {tr("Группировка по локациям", "Group by Zone")}
                  </button>
                  <button
                    onClick={() =>
                      copyBatchWaypoints(
                        filteredMounts,
                        tr("Отфильтрованные маунты", "Filtered Mounts")
                      )
                    }
                    className="px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold cursor-pointer flex items-center gap-1"
                    title={tr(
                      "Скопировать до 25 точек /way из текущего списка для аддона TomTom",
                      "Copy up to 25 /way coordinates from current list for TomTom"
                    )}
                  >
                    <Copy size={12} />{" "}
                    {tr("Экспорт /way списка", "Export /way List")}
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={resetAllFilters}
                      className="px-3 py-1 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 font-bold cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw size={12} />{" "}
                      {tr("Сбросить фильтры", "Reset Filters")}
                    </button>
                  )}
                </div>
                <span className="text-slate-400">
                  {tr("Найдено маунтов:", "Mounts found:")}{" "}
                  <strong className="text-white">
                    {filteredMounts.length}
                  </strong>
                </span>
              </div>
            </div>

            {/* Cards Grid */}
            {groupByZone ? (
              <div className="space-y-4">
                {groupedByZoneMounts.map(([zoneTitle, zoneMounts]) => (
                  <div
                    key={zoneTitle}
                    className="bg-[#0b111e] border border-slate-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <MapPin size={14} />{" "}
                        {localizeTextByLang(zoneTitle, lang)}
                      </h3>
                      <span className="text-xs font-bold text-slate-400">
                        {zoneMounts.length} {tr("шт.", "mounts")}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {zoneMounts.map((mount) => {
                        const isGoal = goalIds.includes(mount.id);
                        const { primary, secondary } = getMountTitles(mount);
                        const locReq = getLocalizedMountField(
                          mount,
                          "requirements",
                          lang
                        );
                        const locSummary = getLocalizedMountField(
                          mount,
                          "summary",
                          lang
                        );
                        const locPinLabel = getLocalizedMountField(
                          mount,
                          "pinLabel",
                          lang
                        );
                        const locWay = getLocalizedMountField(
                          mount,
                          "waypoint",
                          lang
                        );
                        const locPinMacro = getLocalizedMountField(
                          mount,
                          "blizzardPinMacro",
                          lang
                        );
                        return (
                          <div
                            key={mount.id}
                            className="bg-[#0e1525] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-3 transition"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-start gap-3">
                                <img
                                  src={mount.iconUrl}
                                  alt={primary}
                                  onError={(e) => {
                                    e.currentTarget.src = FALLBACK_MOUNT_ICON;
                                  }}
                                  className="w-12 h-12 rounded-xl border border-slate-700 shrink-0 bg-slate-900"
                                />
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-black text-white leading-snug">
                                    {primary}
                                  </h3>
                                  {secondary && (
                                    <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                                      {secondary}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {mount.difficultyBadge && (
                                      <span
                                        title={
                                          lang === "en"
                                            ? mount.difficultyBadge.titleEn
                                            : mount.difficultyBadge.title
                                        }
                                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${mount.difficultyBadge.badgeClass}`}
                                      >
                                        {lang === "en"
                                          ? mount.difficultyBadge.labelEn
                                          : mount.difficultyBadge.label}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                                        mount.isDfaVerified
                                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                          : "bg-slate-800 text-slate-300"
                                      }`}
                                    >
                                      📊 {tr("У игроков:", "Owned:")}{" "}
                                      {mount.worldRarityDisplay}
                                    </span>
                                    <span
                                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                                        mount.trialCompatible
                                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                      }`}
                                    >
                                      {mount.trialCompatible
                                        ? tr(
                                            "🆓 Триал ≤20 ур.",
                                            "🆓 Trial ≤Lv 20"
                                          )
                                        : tr("💳 Подписка", "💳 Sub Required")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {locReq && (
                                <div className="bg-[#090d16] border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-200 font-medium">
                                  📋{" "}
                                  <strong>
                                    {tr("Требования:", "Requirements:")}
                                  </strong>{" "}
                                  {locReq}
                                </div>
                              )}
                              <p className="text-xs text-slate-200 leading-relaxed">
                                {locSummary}
                              </p>
                              {locWay && (
                                <div className="bg-[#090d16] border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                                  <span
                                    className="text-slate-300 truncate"
                                    title={locWay}
                                  >
                                    📍 {locPinLabel}
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          locPinMacro,
                                          tr(
                                            `📌 Булавка на карту скопирована! Вставь в чат WoW (${locPinLabel})`,
                                            `📌 Map Pin copied! Paste into WoW chat (${locPinLabel})`
                                          )
                                        )
                                      }
                                      className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer flex items-center gap-1"
                                      title={tr(
                                        "Поставить стандартную булавку Blizzard на карту в игре (без аддонов)",
                                        "Set standard Blizzard map pin in-game (no addons required)"
                                      )}
                                    >
                                      <MapPin size={11} />{" "}
                                      {tr("Булавка", "Map Pin")}
                                    </button>
                                    <button
                                      onClick={() =>
                                        copyToClipboard(
                                          locWay,
                                          `${tr(
                                            "Скопировано для TomTom:",
                                            "Copied for TomTom:"
                                          )} ${locWay}`
                                        )
                                      }
                                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold cursor-pointer flex items-center gap-1"
                                      title={tr(
                                        "Скопировать команду /way для аддона TomTom",
                                        "Copy /way command for TomTom addon"
                                      )}
                                    >
                                      <Copy size={10} /> /way
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
                              <div className="flex items-center gap-2">
                                <a
                                  href={
                                    mount.spellId
                                      ? `https://www.wowhead.com/${
                                          lang === "en" ? "" : "ru/"
                                        }spell=${mount.spellId}`
                                      : `https://www.wowhead.com/${
                                          lang === "en" ? "" : "ru/"
                                        }search?q=${encodeURIComponent(
                                          mount.nameEn || mount.nameRu
                                        )}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
                                >
                                  Wowhead <ExternalLink size={11} />
                                </a>
                                <button
                                  onClick={() => toggleGoal(mount.id)}
                                  className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                                    isGoal
                                      ? "bg-amber-400 text-slate-950"
                                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                  }`}
                                >
                                  {isGoal
                                    ? tr("🎯 В целях", "🎯 In Goals")
                                    : tr("+ В цели", "+ Goal")}
                                </button>
                              </div>
                              <button
                                onClick={() => toggleCollected(mount)}
                                className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer flex items-center gap-1"
                              >
                                <Check size={13} />{" "}
                                {tr("Получено", "Collected")}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMounts.slice(0, visibleLimit).map((mount) => {
                  const isGoal = goalIds.includes(mount.id);
                  const isExpanded = Boolean(expandedCardIds[mount.id]);
                  const { primary, secondary } = getMountTitles(mount);
                  const locExp = getLocalizedMountField(
                    mount,
                    "expansion",
                    lang
                  );
                  const locZone = getLocalizedMountField(mount, "zone", lang);
                  const locReq = getLocalizedMountField(
                    mount,
                    "requirements",
                    lang
                  );
                  const locSummary = getLocalizedMountField(
                    mount,
                    "summary",
                    lang
                  );
                  const locSteps = getLocalizedMountField(mount, "steps", lang);
                  const locPinLabel = getLocalizedMountField(
                    mount,
                    "pinLabel",
                    lang
                  );
                  const locWay = getLocalizedMountField(
                    mount,
                    "waypoint",
                    lang
                  );
                  const locPinMacro = getLocalizedMountField(
                    mount,
                    "blizzardPinMacro",
                    lang
                  );
                  return (
                    <div
                      key={mount.id}
                      className="bg-[#0e1525] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between gap-3 transition"
                    >
                      <div className="space-y-2.5">
                        {/* Icon + Title (In EN mode: only English primary title, no smaller subtitle) */}
                        <div className="flex items-start gap-3">
                          <img
                            src={mount.iconUrl}
                            alt={primary}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_MOUNT_ICON;
                            }}
                            className="w-12 h-12 rounded-xl border border-slate-700 shrink-0 bg-slate-900"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black text-white leading-snug">
                              {primary}
                            </h3>
                            {secondary && (
                              <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                                {secondary}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {mount.difficultyBadge && (
                                <span
                                  title={
                                    lang === "en"
                                      ? mount.difficultyBadge.titleEn
                                      : mount.difficultyBadge.title
                                  }
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${mount.difficultyBadge.badgeClass}`}
                                >
                                  {lang === "en"
                                    ? mount.difficultyBadge.labelEn
                                    : mount.difficultyBadge.label}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                                  mount.isDfaVerified
                                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                📊 {tr("У игроков:", "Owned:")}{" "}
                                {mount.worldRarityDisplay}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                                  mount.trialCompatible
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {mount.trialCompatible
                                  ? tr("🆓 Триал ≤20 ур.", "🆓 Trial ≤Lv 20")
                                  : tr("💳 Подписка", "💳 Sub Required")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 space-y-1.5">
                          <div className="flex items-center gap-1 text-slate-400 font-semibold">
                            <MapPin
                              size={12}
                              className="text-amber-400 shrink-0"
                            />
                            <span className="truncate">
                              {locExp} • {locZone}
                            </span>
                          </div>
                          {locReq && (
                            <div className="bg-[#090d16] border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-200 font-medium leading-snug">
                              📋{" "}
                              <strong>
                                {tr(
                                  "Требования и условия:",
                                  "Requirements & Conditions:"
                                )}
                              </strong>{" "}
                              {locReq}
                            </div>
                          )}
                          <p className="text-slate-200 leading-relaxed">
                            {locSummary}
                          </p>
                        </div>

                        {locWay && (
                          <div className="bg-[#090d16] border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className="text-slate-300 truncate"
                              title={locWay}
                            >
                              📍 {locPinLabel}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    locPinMacro,
                                    tr(
                                      `📌 Булавка на карту скопирована! Вставь в чат WoW — на карте появится метка (${locPinLabel})`,
                                      `📌 Map Pin copied! Paste into WoW chat to set waypoint (${locPinLabel})`
                                    )
                                  )
                                }
                                className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer flex items-center gap-1"
                                title={tr(
                                  "Поставить стандартную булавку Blizzard на карту в игре (без аддонов)",
                                  "Set standard Blizzard map pin in-game (no addons required)"
                                )}
                              >
                                <MapPin size={11} /> {tr("Булавка", "Map Pin")}
                              </button>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    locWay,
                                    `${tr(
                                      "Скопировано для TomTom:",
                                      "Copied for TomTom:"
                                    )} ${locWay}`
                                  )
                                }
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold shrink-0 cursor-pointer flex items-center gap-1"
                                title={tr(
                                  "Скопировать команду /way для аддона TomTom",
                                  "Copy /way command for TomTom addon"
                                )}
                              >
                                <Copy size={11} /> /way
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Interactive Step-by-Step Guide Toggle */}
                        {Array.isArray(locSteps) && locSteps.length > 0 && (
                          <div className="pt-0.5">
                            <button
                              onClick={() => toggleCardExpanded(mount.id)}
                              className="text-[11px] font-bold text-sky-300 hover:text-sky-200 flex items-center gap-1 cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp size={13} />
                              ) : (
                                <ChevronDown size={13} />
                              )}
                              {tr("Пошаговая инструкция", "Step-by-Step Guide")}{" "}
                              ({locSteps.length})
                            </button>
                            {isExpanded && (
                              <div className="mt-1.5 bg-[#090d16] border border-slate-800 rounded-xl p-2.5 space-y-1.5">
                                {locSteps.map((stepText, sIdx) => {
                                  const stepDone = Boolean(
                                    completedSteps[`${mount.id}_step_${sIdx}`]
                                  );
                                  return (
                                    <label
                                      key={sIdx}
                                      onClick={() =>
                                        toggleStepCompleted(mount.id, sIdx)
                                      }
                                      className="flex items-start gap-2 text-[11px] cursor-pointer select-none"
                                    >
                                      <span
                                        className={`mt-0.5 w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                          stepDone
                                            ? "bg-emerald-400 border-emerald-300 text-slate-950"
                                            : "border-slate-600 text-transparent"
                                        }`}
                                      >
                                        ✓
                                      </span>
                                      <span
                                        className={
                                          stepDone
                                            ? "line-through text-slate-500"
                                            : "text-slate-200"
                                        }
                                      >
                                        {stepText}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-2">
                          <a
                            href={
                              mount.spellId
                                ? `https://www.wowhead.com/${
                                    lang === "en" ? "" : "ru/"
                                  }spell=${mount.spellId}`
                                : `https://www.wowhead.com/${
                                    lang === "en" ? "" : "ru/"
                                  }search?q=${encodeURIComponent(
                                    mount.nameEn || mount.nameRu
                                  )}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1"
                          >
                            Wowhead <ExternalLink size={11} />
                          </a>
                          <button
                            onClick={() => toggleGoal(mount.id)}
                            className={`px-2 py-1 rounded-lg font-bold cursor-pointer ${
                              isGoal
                                ? "bg-amber-400 text-slate-950"
                                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            {isGoal
                              ? tr("🎯 В целях", "🎯 In Goals")
                              : tr("+ В цели", "+ Goal")}
                          </button>
                        </div>

                        <button
                          onClick={() => toggleCollected(mount)}
                          className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer flex items-center gap-1"
                        >
                          <Check size={13} /> {tr("Получено", "Collected")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination / Load More Button */}
            {filteredMounts.length > visibleLimit && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setVisibleLimit((prev) => prev + 120)}
                  className="px-5 py-2.5 rounded-2xl bg-[#0e1525] hover:bg-slate-800 border border-amber-400/50 text-amber-300 font-black text-xs cursor-pointer"
                >
                  {tr(
                    `Показать ещё +120 маунтов (показано ${visibleLimit} из ${filteredMounts.length})`,
                    `Load +120 More Mounts (showing ${visibleLimit} of ${filteredMounts.length})`
                  )}
                </button>
                <button
                  onClick={() => setVisibleLimit(filteredMounts.length)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  {tr(
                    `Показать все (${filteredMounts.length})`,
                    `Show All (${filteredMounts.length})`
                  )}
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
