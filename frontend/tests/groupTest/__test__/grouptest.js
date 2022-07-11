jest.mock('../request');

import * as group from '../groupFetcher';

// The assertion for a promise must be returned.
test('works with promises', () => {
  expect.assertions(1);
  return group.getGroup('62bcf9d935ecd3b837093c78').then(data => expect(data.label).toEqual("mockLabel"));
});