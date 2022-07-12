module.exports = {
  //preset: "@shelf/jest-mongodb",
  preset: 'ts-jest',
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
    "\.js$": "<rootDir>/node_modules/babel-jest"
  }
};