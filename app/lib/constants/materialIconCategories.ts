// Material Icons Outlined 分類常量
export const MATERIAL_ICON_CATEGORIES: Record<string, string[]> = {
  '教育': [
    'menu_book', 'auto_stories', 'school', 'history_edu', 'library_books', 'book', 'bookmark', 'bookmark_border',
    'class', 'subject', 'assignment', 'assignment_ind', 'quiz', 'grading', 'fact_check', 'checklist',
    'description', 'article', 'note', 'note_add', 'sticky_note_2', 'text_snippet', 'drafts', 'edit_note'
  ],
  '數學與科學': [
    'calculate', 'functions', 'percent', 'square_foot', 'straighten', 'ruler', 'compass_calibration',
    'science', 'biotech', 'psychology', 'memory', 'flask', 'beaker', 'microscope'
  ],
  '語言與溝通': [
    'public', 'language', 'translate', 'mic', 'mic_none', 'mic_off',
    'volume_up', 'volume_down', 'volume_off', 'hearing', 'headphones', 'speaker', 'chat', 'forum',
    'message', 'comment', 'comments', 'question_answer', 'support_agent', 'contact_support'
  ],
  '藝術與創意': [
    'palette', 'brush', 'draw', 'edit', 'create', 'folder',
    'image', 'photo', 'photo_library', 'collections', 'wallpaper',
    'theater_comedy', 'movie', 'videocam', 'camera_alt', 'slideshow'
  ],
  '音樂與表演': [
    'music_note', 'library_music', 'headphones', 'radio', 'equalizer', 'graphic_eq', 'audiotrack',
    'piano', 'guitar', 'drum_kit', 'violin', 'saxophone', 'trumpet', 'flute', 'mic',
    'theater_comedy'
  ],
  '運動與活動': [
    'sports_soccer', 'sports_basketball', 'sports_volleyball', 'sports_tennis', 'sports_baseball',
    'sports_football', 'sports_golf', 'sports_esports',
    'fitness_center', 'pool', 'rowing', 'sailing', 'surfing', 'skateboarding', 'snowboarding',
    'skiing', 'hiking', 'camping', 'running', 'cycling', 'swimming', 'diving'
  ],
  '科技與工具': [
    'computer', 'laptop', 'desktop_windows', 'tablet', 'phone_android', 'phone_iphone', 'smartphone',
    'watch', 'tablet_mac', 'devices', 'router', 'wifi', 'bluetooth',
    'code', 'terminal', 'developer_mode', 'bug_report', 'settings', 'tune', 'build', 'construction',
    'engineering', 'factory'
  ],
  '自然與環境': [
    'eco', 'nature', 'park', 'forest', 'tree', 'flower', 'grass', 'water_drop', 'waves',
    'beach_access', 'mountain', 'landscape', 'terrain', 'satellite', 'map', 'location_on',
    'place', 'explore', 'compass', 'navigation', 'directions', 'route', 'traffic'
  ],
  '建築與場所': [
    'home', 'apartment', 'business', 'store', 'storefront', 'shopping_cart', 'shopping_bag',
    'restaurant', 'local_cafe', 'hotel', 'hospital', 'local_hospital', 'school', 'library',
    'museum', 'theater', 'stadium', 'church', 'temple', 'mosque', 'synagogue', 'bank',
    'atm', 'post_office', 'mail', 'package', 'inventory', 'warehouse'
  ],
  '交通與旅行': [
    'directions_car', 'directions_bus', 'directions_subway', 'train', 'flight', 'flight_takeoff',
    'flight_land', 'sailing', 'directions_boat', 'two_wheeler', 'motorcycle', 'bike', 'scooter',
    'directions_walk', 'directions_run', 'hiking', 'luggage', 'beach_access', 'explore', 'map',
    'location_on', 'place', 'navigation', 'compass', 'route', 'traffic', 'traffic_light'
  ],
  '獎勵與成就': [
    'star', 'stars', 'favorite', 'favorite_border', 'thumb_up', 'thumb_down', 'celebration',
    'trophy', 'diamond', 'gem', 'local_fire_department', 'whatshot', 'trending_up', 'show_chart',
    'bar_chart', 'pie_chart', 'assessment', 'analytics', 'insights', 'lightbulb'
  ],
  '時間與日曆': [
    'schedule', 'event', 'calendar_today', 'calendar_month', 'date_range', 'today', 'access_time',
    'timer', 'hourglass_empty', 'hourglass_full', 'watch', 'alarm', 'notifications', 'notifications_active',
    'reminder', 'history', 'update', 'refresh', 'sync', 'autorenew', 'pending', 'schedule_send'
  ],
  '文件與資料': [
    'folder', 'folder_open', 'insert_drive_file', 'description', 'article', 'text_snippet',
    'note', 'sticky_note_2', 'drafts', 'archive', 'inventory', 'storage', 'cloud', 'cloud_upload',
    'cloud_download', 'backup', 'save', 'download', 'upload', 'attach_file', 'link', 'insert_link'
  ],
  '人物與社交': [
    'person', 'people', 'group', 'person_add', 'person_remove', 'supervisor_account', 'account_circle',
    'face', 'sentiment_satisfied', 'sentiment_dissatisfied', 'mood', 'mood_bad', 'tag_faces',
    'contacts', 'contact_mail', 'contact_phone', 'share', 'share_location', 'group_add', 'team'
  ],
  '健康與醫療': [
    'local_hospital', 'medical_services', 'healing', 'medication', 'vaccines', 'fitness_center',
    'self_improvement', 'spa', 'wellness', 'health_and_safety', 'sanitizer', 'masks', 'coronavirus',
    'pulse', 'thermometer'
  ],
  '遊戲與娛樂': [
    'sports_esports', 'videogame_asset', 'games', 'casino', 'dice', 'puzzle',
    'toys', 'tv', 'movie', 'theater_comedy'
  ],
  '其他': [
    'more_horiz', 'more_vert', 'apps', 'dashboard', 'grid_view', 'view_list', 'view_module',
    'settings', 'tune', 'filter_list', 'sort', 'search', 'help', 'info', 'warning', 'error',
    'check_circle', 'cancel', 'close', 'add', 'remove', 'delete', 'edit', 'save', 'undo', 'redo'
  ]
}

// 獲取所有 Material Icons（用於搜索）
export const getAllMaterialIcons = (): string[] => {
  return Object.values(MATERIAL_ICON_CATEGORIES).flat()
}

// 查找 Material Icon 所屬的分類
export const findMaterialIconCategory = (icon: string): string | null => {
  for (const [category, icons] of Object.entries(MATERIAL_ICON_CATEGORIES)) {
    if (icons.includes(icon)) {
      return category
    }
  }
  return null
}
