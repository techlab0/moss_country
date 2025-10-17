'use client';
import React from 'react';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function StorePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Container>
        <div className="py-20">
          <h1 className="text-4xl font-bold text-center mb-8">店舗情報</h1>
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">MOSS COUNTRY</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p><strong>住所:</strong> 札幌市西区発寒11条4丁目3-1</p>
                <p><strong>電話:</strong> 080-3605-6340</p>
                <p><strong>メール:</strong> moss.country.kokenokuni@gmail.com</p>
                <p><strong>営業時間:</strong> 11:00 - 20:00</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}