interface MegaMenuItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  badge?: {
    text: string;
    color: string;
  };
  image?: string;
  children?: MegaMenuItem[];
}

export interface MegaMenuColumn {
  title: string;
  items: MegaMenuItem[];
}

export interface MegaMenuCategory {
  id: string;
  title: string;
  slug: string;
  image?: string;
  icon?: string;
  columns: MegaMenuColumn[];
  featured?: {
    title: string;
    image: string;
    link: string;
  };
}


