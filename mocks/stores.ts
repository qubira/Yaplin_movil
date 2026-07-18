export interface Store {
  id: string;
  name: string;
  address: string;
  account: string;
  status: 'active' | 'inactive';
  methods: ('yape' | 'plin' | 'izipay')[];
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: 'owner' | 'supervisor' | 'cajero';
  email: string;
  storeId: string | 'all';
  active: boolean;
}

