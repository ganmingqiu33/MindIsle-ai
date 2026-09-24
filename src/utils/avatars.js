/* ============================================================
 * 网站内置头像库（不支持用户上传，只能从本站提供的头像中选择）
 * 头像 = 高饱和圆底 + emoji 形象
 * ============================================================ */

export const AVATARS = [
  { id: 1, emoji: '🐱', bg: '#FBBC04' },
  { id: 2, emoji: '🐰', bg: '#EA4335' },
  { id: 3, emoji: '🦊', bg: '#FF7A45' },
  { id: 4, emoji: '🐧', bg: '#1A73E8' },
  { id: 5, emoji: '🐨', bg: '#34A853' },
  { id: 6, emoji: '🦉', bg: '#A142F4' },
  { id: 7, emoji: '🐳', bg: '#00ACC1' },
  { id: 8, emoji: '🐻', bg: '#8D6E63' },
]

export const DEFAULT_AVATAR_ID = 1

export const getAvatar = (id) =>
  AVATARS.find((a) => a.id === Number(id)) || AVATARS[0]
