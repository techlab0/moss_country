import { getSimpleWorkshops } from '@/lib/sanity'

export default async function TestPage() {
  const workshops = await getSimpleWorkshops()

  return (
    <div className="min-h-screen bg-gray-100 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">CMS データテスト</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">取得されたワークショップデータ</h2>
          
          {workshops.length === 0 ? (
            <p className="text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-4">
              {workshops.map((workshop: {_id: string, title: string, description: string, price?: number, duration?: string}) => (
                <div key={workshop._id} className="border-b pb-4">
                  <h3 className="text-lg font-medium text-moss-green">{workshop.title}</h3>
                  <p className="text-gray-600 mt-2">{workshop.description}</p>
                  <div className="mt-2 flex gap-4 text-sm text-gray-500">
                    <span>料金: ¥{workshop.price?.toLocaleString()}</span>
                    <span>所要時間: {workshop.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            データが表示されない場合は、管理画面でコンテンツを「Publish」してください
          </p>
        </div>
      </div>
    </div>
  )
}