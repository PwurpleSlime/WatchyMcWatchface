import { AppService } from './app.service';

describe('AppService search tolerance', () => {
  const item = {
    name: 'Planes, Trains and Automobiles',
    imgURL: 'poster.jpg',
  };

  function createService() {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      range: jest.fn().mockResolvedValue({ data: [item], error: null }),
    };
    const service = new AppService();
    Object.defineProperty(service, 'supabaseClient', {
      value: { from: jest.fn().mockReturnValue(queryBuilder) },
    });
    return { service, queryBuilder };
  }

  it.each([
    'Planes Trains and Automobiles',
    'Plnes Trains and Automobiles',
    'Plnes Trains and Automobles',
  ])('finds a title for query "%s"', async (query) => {
    const { service } = createService();

    await expect(service.getSearchResult(query)).resolves.toEqual([
      { name: item.name, imgURL: item.imgURL },
    ]);
  });
});
