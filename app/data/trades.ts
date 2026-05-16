export type Offer = {
  id: string;
  type: 'offer' | 'counteroffer';
  fromName: string;
  message: string;
  createdAt: number;
};

export type Trade = {
  id: string;
  title: string;
  description: string;
  wantDescription: string;
  postedBy: string;
  createdAt: number;
  offers: Offer[];
};
