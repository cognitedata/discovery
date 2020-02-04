export const sdk = jest.fn().mockImplementation(() => {
  return {
    assets: {
      search: jest.fn(),
    },
  };
});
