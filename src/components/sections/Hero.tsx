import React from 'react';
import { FullScreenFV } from '@/components/ui/FullScreenFV';

const fvSlides = [
  {
    id: '1',
    image: '/images/misc/moss01.jpeg',
    title: 'MOSS COUNTRY',
    subtitle: '苔のある生活をあなたに。生活に『癒し』と『和み』を。',
    description: '苔の緑に心をゆだねて、穏やかなひとときを。Moss Countryが癒しの空間をお届けします。'
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