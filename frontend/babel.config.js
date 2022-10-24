module.exports = api => {
	const isTest = api.env('test');
	api.cache(true);
	if (isTest) {
		return {
			presets: [
				['@babel/preset-env', {targets: {node: 'current'}}],
				'@babel/preset-typescript',
			  ],			
		}
	}
	return {
		        presets: ['next/babel'],

	}
};