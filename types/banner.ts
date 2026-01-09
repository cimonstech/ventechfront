export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  link_text?: string;
  button_text?: string;
  type: 'hero' | 'sidebar' | 'promotion' | 'category';
  position: number;
  active: boolean;
  start_date?: string;
  end_date?: string;
  background_color?: string;
  text_color?: string;
  created_at: string;
  updated_at: string;
}

export interface HeroSlide extends Banner {
  type: 'hero';
}

export interface SidebarBanner extends Banner {
  type: 'sidebar';
  size: 'small' | 'medium' | 'large';
}


