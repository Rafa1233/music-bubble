export const CATEGORY_GROUPS = [
  {
    group: 'discover',
    title: 'Discover & Trending Global',
    items: [
      { id: 'audius-trending', label: 'Trending Full Track', audiusTrending: true, archiveQuery: 'electronic pop', itunesQuery: 'top hits 2025', country: 'US' },
      { id: 'new-releases', label: 'Rilisan Terbaru', audiusTrending: true, audiusTime: 'month', jamendoTag: 'pop', itunesQuery: 'new music friday', country: 'US' },
      { id: 'hidden-gems', label: 'Hidden Gems (Full)', audiusQuery: 'indie electronic chill vocal', archiveQuery: 'indie acoustic', jamendoTag: 'indie' },
    ],
  },
  {
    group: 'indonesia',
    title: 'Musik Indonesia',
    note: 'Full track indie/akustik diambil dari Audius/Archive; katalog label komersial Indonesia dari Apple iTunes berstatus PREVIEW 30s.',
    items: [
      { id: 'indo-popular', label: 'Populer Indonesia', audiusQuery: 'indonesia pop acoustic', itunesQuery: 'mahalini tulus bernadya lyodra', country: 'ID' },
      { id: 'indo-pop', label: 'Pop Indonesia', audiusQuery: 'indonesian pop', itunesQuery: 'pop indonesia hits', country: 'ID' },
      { id: 'indo-galau', label: 'Galau Indonesia', audiusQuery: 'indonesia sad acoustic', itunesQuery: 'lagu galau indonesia', country: 'ID' },
      { id: 'indo-romantis', label: 'Romantis Indonesia', audiusQuery: 'indonesia love song', itunesQuery: 'lagu romantis indonesia', country: 'ID' },
      { id: 'indo-akustik', label: 'Akustik Indonesia', audiusQuery: 'akustik indonesia cover', itunesQuery: 'akustik indonesia', country: 'ID' },
      { id: 'indo-indie', label: 'Indie Indonesia', audiusQuery: 'indie indonesia', itunesQuery: 'hindia feby putri pamungkas', country: 'ID' },
      { id: 'indo-viral', label: 'Viral & Nostalgia Indo', audiusQuery: 'indonesia remix viral', itunesQuery: 'sheila on 7 dewa 19', country: 'ID' },
    ],
  },
  {
    group: 'english',
    title: 'English & International',
    items: [
      { id: 'en-global', label: 'Global Hits', audiusTrending: true, audiusGenre: 'Pop', itunesQuery: 'taylor swift weeknd bruno mars', country: 'US' },
      { id: 'en-love', label: 'English Love', audiusQuery: 'love ballad acoustic', jamendoTag: 'romantic', itunesQuery: 'english love songs', country: 'US' },
      { id: 'en-sad', label: 'English Sad', audiusQuery: 'sad emotional vocal', jamendoTag: 'sad', itunesQuery: 'sad pop songs', country: 'US' },
      { id: 'en-rnb', label: 'English R&B', audiusGenre: 'R&B/Soul', audiusTrending: true, jamendoTag: 'rnb', itunesQuery: 'sza frank ocean rnb', country: 'US' },
      { id: 'en-hiphop', label: 'English Hip-Hop', audiusGenre: 'Hip-Hop/Rap', audiusTrending: true, jamendoTag: 'hiphop', itunesQuery: 'kendrick drake hip hop', country: 'US' },
      { id: 'en-rock', label: 'English Rock', audiusGenre: 'Rock', audiusTrending: true, archiveQuery: 'rock band', jamendoTag: 'rock', itunesQuery: 'coldplay imagine dragons', country: 'US' },
    ],
  },
  {
    group: 'kpop',
    title: 'K-Pop',
    items: [
      { id: 'kpop-trending', label: 'K-Pop Trending', audiusQuery: 'kpop', itunesQuery: 'kpop hits', country: 'KR' },
      { id: 'kpop-gg', label: 'Girl Groups', audiusQuery: 'kpop girl group remix', itunesQuery: 'blackpink aespa newjeans twice', country: 'KR' },
      { id: 'kpop-bg', label: 'Boy Groups', audiusQuery: 'kpop boy group', itunesQuery: 'bts stray kids seventeen', country: 'KR' },
      { id: 'kpop-solo', label: 'Korean Solo & Ballad', audiusQuery: 'korean ballad ost', itunesQuery: 'iu taeyeon jungkook', country: 'KR' },
    ],
  },
  {
    group: 'genres',
    title: 'Genre Musik (20 Genre)',
    items: [
      { id: 'g-pop', label: 'Pop', audiusGenre: 'Pop', audiusTrending: true, jamendoTag: 'pop' },
      { id: 'g-rock', label: 'Rock', audiusGenre: 'Rock', audiusTrending: true, archiveQuery: 'rock', jamendoTag: 'rock' },
      { id: 'g-alt', label: 'Alternative', audiusGenre: 'Alternative', audiusTrending: true, jamendoTag: 'alternative' },
      { id: 'g-indie', label: 'Indie', audiusQuery: 'indie', archiveQuery: 'indie', jamendoTag: 'indie' },
      { id: 'g-rnb', label: 'R&B', audiusGenre: 'R&B/Soul', audiusTrending: true, jamendoTag: 'rnb' },
      { id: 'g-hiphop', label: 'Hip-Hop', audiusGenre: 'Hip-Hop/Rap', audiusTrending: true, jamendoTag: 'hiphop' },
      { id: 'g-rap', label: 'Rap', audiusQuery: 'rap', jamendoTag: 'rap' },
      { id: 'g-jazz', label: 'Jazz', audiusGenre: 'Jazz', audiusTrending: true, archiveQuery: 'jazz', jamendoTag: 'jazz' },
      { id: 'g-blues', label: 'Blues', audiusQuery: 'blues guitar', archiveQuery: 'blues', jamendoTag: 'blues' },
      { id: 'g-edm', label: 'EDM', audiusGenre: 'Electronic', audiusTrending: true, jamendoTag: 'edm' },
      { id: 'g-electronic', label: 'Electronic', audiusGenre: 'Electronic', audiusTrending: true, jamendoTag: 'electronic' },
      { id: 'g-house', label: 'House', audiusGenre: 'House', audiusTrending: true, jamendoTag: 'house' },
      { id: 'g-classical', label: 'Classical', audiusGenre: 'Classical', audiusTrending: true, archiveQuery: 'classical piano symphony', jamendoTag: 'classical' },
      { id: 'g-acoustic', label: 'Acoustic', audiusGenre: 'Acoustic', audiusTrending: true, archiveQuery: 'acoustic guitar', jamendoTag: 'acoustic' },
      { id: 'g-folk', label: 'Folk', audiusGenre: 'Folk', audiusTrending: true, archiveQuery: 'folk music', jamendoTag: 'folk' },
      { id: 'g-country', label: 'Country', audiusGenre: 'Country', audiusTrending: true, archiveQuery: 'country music', jamendoTag: 'country' },
      { id: 'g-reggae', label: 'Reggae', audiusGenre: 'Reggae', audiusTrending: true, archiveQuery: 'reggae', jamendoTag: 'reggae' },
      { id: 'g-metal', label: 'Metal', audiusGenre: 'Metal', audiusTrending: true, archiveQuery: 'heavy metal', jamendoTag: 'metal' },
      { id: 'g-lofi', label: 'Lo-Fi', audiusGenre: 'Lo-Fi', audiusTrending: true, archiveQuery: 'lofi beats', jamendoTag: 'lofi' },
      { id: 'g-inst', label: 'Instrumental', audiusQuery: 'instrumental piano ambient', archiveQuery: 'instrumental', jamendoTag: 'instrumental' },
    ],
  },
  {
    group: 'moods',
    title: 'Mood & Suasana (12 Mood)',
    items: [
      { id: 'm-happy', label: 'Happy', audiusQuery: 'happy upbeat pop', jamendoTag: 'happy' },
      { id: 'm-sad', label: 'Sad', audiusQuery: 'sad piano emotional', jamendoTag: 'sad' },
      { id: 'm-relax', label: 'Relax', audiusQuery: 'relaxing ambient', archiveQuery: 'relaxing', jamendoTag: 'relax' },
      { id: 'm-chill', label: 'Chill', audiusQuery: 'chill beats', jamendoTag: 'chillout' },
      { id: 'm-focus', label: 'Focus', audiusQuery: 'focus deep work', archiveQuery: 'ambient focus', jamendoTag: 'ambient' },
      { id: 'm-study', label: 'Study', audiusQuery: 'study lofi', jamendoTag: 'lofi' },
      { id: 'm-sleep', label: 'Sleep', audiusQuery: 'sleep ambient rain', archiveQuery: 'sleep ambient', jamendoTag: 'sleep' },
      { id: 'm-romantic', label: 'Romantic', audiusQuery: 'romantic acoustic', jamendoTag: 'romantic' },
      { id: 'm-workout', label: 'Workout', audiusQuery: 'workout bass gym', jamendoTag: 'energetic' },
      { id: 'm-motivation', label: 'Motivation', audiusQuery: 'motivational epic', jamendoTag: 'epic' },
      { id: 'm-night', label: 'Night Drive', audiusQuery: 'synthwave night drive', jamendoTag: 'synthwave' },
      { id: 'm-rainy', label: 'Rainy Day', audiusQuery: 'rainy day jazz piano', jamendoTag: 'jazz' },
    ],
  },
];

export function findCategoryById(id) {
  for (const g of CATEGORY_GROUPS) {
    const found = g.items.find((i) => i.id === id);
    if (found) return { ...found, groupNote: g.note || '' };
  }
  return null;
}
