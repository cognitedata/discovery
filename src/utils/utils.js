export function sleep(timeout) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export function arrayToObjectById(array) {
  return array.reduce((obj, item) => {
    obj[item.id] = item;
    return obj;
  }, {});
}
