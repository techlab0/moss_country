import React from 'react';
import { FullScreenFV } from '@/components/ui/FullScreenFV';

const fvSlides = [
  {
    id: '1',
    video: '/images/background/background_mov01.mov',
    title: 'MOSS COUNTRY',
    subtitle: '小さなガラスの中に広がる',
    description: '北海道初のカプセルテラリウム専門店。職人が手がける本格テラリウムで、あなたの暮らしに緑の癒しを。'
  }
];

export const Hero: React.FC = () => {
  return (
    <FullScreenFV 
      slides={fvSlides}
      autoPlay={true}
      interval={8000}
    />
  );
};