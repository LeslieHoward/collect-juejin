function safeParse(value, defaults) {
  const parsed = _.attempt(JSON.parse, value);
  return _.isError(parsed) ? defaults : parsed;
}

function safeStringify(value) {
  const stringified = _.attempt(JSON.stringify, value);
  return _.isError(stringified) ? value : stringified;
}

function setLocalStorageBatch(storageData) {
  _.forEach(storageData, (value, key) => {
    localStorage.setItem(key, value);
  });
}

function setSessionStorageBatch(storageData) {
  _.forEach(storageData, (value, key) => {
    sessionStorage.setItem(key, value);
  });
}
