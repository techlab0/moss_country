// 日本語から英語への変換マップ（SEO対応）
const translationMap: Record<string, string> = {
  // テラリウム関連
  'テラリウム': 'terrarium',
  'モスボール': 'moss-ball',
  'こけ': 'moss',
  '苔': 'moss',
  '植物': 'plants',
  '育て方': 'care-guide',
  'お手入れ': 'maintenance',
  'メンテナンス': 'maintenance',
  '作り方': 'how-to-make',
  '手作り': 'handmade',
  'ワークショップ': 'workshop',
  'テスト': 'test',
  '記事': 'article',
  '基本': 'basic',
  '基本的': 'basic',
  '方法': 'method',
  
  // 一般的な単語
  'お知らせ': 'news',
  'ニュース': 'news',
  '新商品': 'new-product',
  'イベント': 'event',
  '販売': 'sale',
  '開始': 'start',
  '終了': 'end',
  '限定': 'limited',
  '特別': 'special',
  '人気': 'popular',
  'おすすめ': 'recommended',
  '初心者': 'beginner',
  '上級者': 'advanced',
  '簡単': 'easy',
  '難しい': 'difficult',
  '基本': 'basic',
  '応用': 'advanced',
  '方法': 'method',
  '手順': 'steps',
  'コツ': 'tips',
  '注意': 'caution',
  '重要': 'important',
  '必要': 'necessary',
  '便利': 'useful',
  '効果': 'effect',
  '結果': 'result',
  '成功': 'success',
  '失敗': 'failure',
  '問題': 'problem',
  '解決': 'solution',
  '改善': 'improvement',
  '更新': 'update',
  '変更': 'change',
  '追加': 'addition',
  '削除': 'removal',
  '修正': 'fix',
  
  // 月・季節
  '春': 'spring',
  '夏': 'summer',
  '秋': 'autumn',
  '冬': 'winter',
  '1月': 'january',
  '2月': 'february',
  '3月': 'march',
  '4月': 'april',
  '5月': 'may',
  '6月': 'june',
  '7月': 'july',
  '8月': 'august',
  '9月': 'september',
  '10月': 'october',
  '11月': 'november',
  '12月': 'december',
  
  // 色
  '緑': 'green',
  '茶': 'brown',
  '白': 'white',
  '黒': 'black',
  '赤': 'red',
  '青': 'blue',
  '黄': 'yellow',
  
  // サイズ
  '大': 'large',
  '中': 'medium',
  '小': 'small',
  '特大': 'extra-large',
  '超小': 'mini',
  
  // 苔の名前関連
  'ホソウリゴケ': 'hosourigoke',
  'コケ': 'koke',
  'ゴケ': 'goke',
  'ウリ': 'uri',
  'ホソ': 'hoso',
  'ミズ': 'mizu',
  'イワ': 'iwa',
  'ヤマ': 'yama',
  'ハイ': 'hai',
  'スナ': 'suna',
  'タマ': 'tama',
  
  // 数字
  '一': '1',
  '二': '2',
  '三': '3',
  '四': '4',
  '五': '5',
  '六': '6',
  '七': '7',
  '八': '8',
  '九': '9',
  '十': '10',
  '百': '100',
  '千': '1000'
};

// ひらがなをローマ字に変換（簡易版）
const hiraganaToRomaji: Record<string, string> = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n',
  'ー': '-', 'っ': '', '、': '', '。': '', '！': '', '？': ''
};

export function generateSEOFriendlySlug(title: string): string {
  let slug = title.toLowerCase();
  
  // 1. 記号や特殊文字を置換（スペースとして扱う）
  slug = slug.replace(/[：:、。！？()（）「」『』]/g, ' ');
  
  // 2. 特定の日本語キーワードを英語に変換（長いものから順に処理）
  const sortedEntries = Object.entries(translationMap).sort(([a], [b]) => b.length - a.length);
  sortedEntries.forEach(([japanese, english]) => {
    const regex = new RegExp(japanese, 'g');
    slug = slug.replace(regex, ` ${english} `);
  });
  
  // 3. 残ったひらがなをローマ字に変換
  for (const [hiragana, romaji] of Object.entries(hiraganaToRomaji)) {
    const regex = new RegExp(hiragana, 'g');
    slug = slug.replace(regex, romaji);
  }
  
  // 4. カタカナをひらがなに変換してからローマ字に変換
  slug = slug.replace(/[ア-ン]/g, (match) => {
    const hiragana = String.fromCharCode(match.charCodeAt(0) - 0x60);
    return hiraganaToRomaji[hiragana] || match;
  });
  
  // 5. 残った漢字・その他日本語文字を除去
  slug = slug.replace(/[一-龯々〆〤]/g, '');
  
  // 6. その他の不要文字を除去（英数字、スペース、ハイフン以外）
  slug = slug.replace(/[^\w\s-]/g, '');
  
  // 7. 複数のスペースを単一のハイフンに変換
  slug = slug.replace(/\s+/g, '-');
  
  // 8. 複数のハイフンを単一に
  slug = slug.replace(/-+/g, '-');
  
  // 9. 先頭・末尾のハイフンを除去
  slug = slug.replace(/^-+|-+$/g, '');
  
  // 10. 長さ制限（SEOのため45文字以内、重複時の連番追加を考慮）
  if (slug.length > 45) {
    // 単語の境界で切り詰める
    const words = slug.split('-');
    let truncated = '';
    for (const word of words) {
      if ((truncated + '-' + word).length <= 45) {
        truncated = truncated ? truncated + '-' + word : word;
      } else {
        break;
      }
    }
    slug = truncated || slug.substring(0, 45);
  }
  
  // 11. 末尾のハイフンを再度除去
  slug = slug.replace(/-+$/, '');
  
  // 12. 空の場合やテストの場合はわかりやすいフォールバック
  if (!slug || slug.length < 3) {
    const now = new Date();
    slug = `post-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  }
  
  // 13. テスト記事の場合は先頭に付ける
  if (title.includes('テスト')) {
    slug = slug.replace(/^test-/, '');
    slug = `test-${slug}`;
  }
  
  return slug;
}

// SEOメタデータ生成
export function generateSEOMetadata(title: string, excerpt: string, category?: string) {
  const seoTitle = title.length > 60 ? `${title.substring(0, 57)}...` : title;
  const seoDescription = excerpt.length > 160 ? `${excerpt.substring(0, 157)}...` : excerpt;
  
  const keywords = [
    'MOSS COUNTRY',
    'テラリウム',
    'モスボール',
    '苔',
    '植物',
    '手作り',
    'インテリア',
    '癒し',
    'グリーン'
  ];
  
  if (category) {
    switch (category) {
      case 'news':
        keywords.push('お知らせ', 'ニュース', '最新情報');
        break;
      case 'howto':
        keywords.push('作り方', '手順', 'DIY', 'ハンドメイド');
        break;
      case 'plants':
        keywords.push('植物図鑑', '育て方', '植物知識');
        break;
      case 'maintenance':
        keywords.push('メンテナンス', 'お手入れ', '管理方法');
        break;
      case 'events':
        keywords.push('イベント', 'ワークショップ', '体験');
        break;
    }
  }
  
  return {
    title: seoTitle,
    description: seoDescription,
    keywords: keywords.join(', ')
  };
}