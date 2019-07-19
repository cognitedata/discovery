const { default: store }: { default: (store?: any) => void } =
  process.env.NODE_ENV === 'production' ? require('./storeProd.ts') : require('./storeDev.ts');

// Exporting the store, then use it anywhere like store.getState() or store.dispatch()
export default store();
