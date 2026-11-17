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

describe('AppService homepage items', () => {
  it('resolves homepage references and groups items by genre', async () => {
    const homepageRows = [
      { for_Id: 'item-1', genre: 'staff' },
      { for_Id: 'item-2', genre: 'Drama' },
      { for_Id: 'item-3', genre: 'staff' },
    ];
    const items = [
      { id: 'item-1', name: 'Movie A', imgURL: 'a.jpg', genre: 'Comedy' },
      { id: 'item-2', name: 'Movie B', imgURL: 'b.jpg', genre: 'Drama' },
      { id: 'item-3', name: 'Movie C', imgURL: 'c.jpg', genre: 'Comedy' },
    ];
    const homepageQuery = {
      select: jest.fn().mockResolvedValue({ data: homepageRows, error: null }),
    };
    const itemsQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: items, error: null }),
    };
    const service = new AppService();
    Object.defineProperty(service, 'supabaseClient', {
      value: {
        from: jest.fn((table: string) =>
          table === 'homePageItems' ? homepageQuery : itemsQuery,
        ),
      },
    });

    await expect(service.getHomePageItems()).resolves.toEqual([
      {
        genre: 'staff',
        items: [
          { name: 'Movie A', imgURL: 'a.jpg' },
          { name: 'Movie C', imgURL: 'c.jpg' },
        ],
      },
      {
        genre: 'Drama',
        items: [{ name: 'Movie B', imgURL: 'b.jpg' }],
      },
    ]);
    expect(itemsQuery.in).toHaveBeenCalledWith('id', [
      'item-1',
      'item-2',
      'item-3',
    ]);
  });

  it('returns no groups when there are no homepage references', async () => {
    const service = new AppService();
    Object.defineProperty(service, 'supabaseClient', {
      value: {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      },
    });

    await expect(service.getHomePageItems()).resolves.toEqual([]);
  });
});
