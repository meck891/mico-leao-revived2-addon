const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { parse } = require('node-html-parser'); // npm i stremio-addon-sdk node-html-parser axios cheerio
const axios = require('axios');
const cheerio = require('cheerio');

const CACHE = new Map(); // Cache simples 1h
const TRACKERS = [
  'https://www.redetorrent.net', // Ex trackers BR
  'https://www.vacatorrent.net',
  'https://torrentdosfilmes.net'
]; // Adicione mais se quiser

const builder = new addonBuilder({
  id: 'org.micoleaorevived',
  version: '1.0.0',
  name: 'Mico Leão Revived',
  description: 'Filmes e séries DUBLADOS PT-BR via torrents BR! HD/FULLHD.',
  resources: ['catalog', 'meta', 'stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt']
});

builder.defineCatalogHandler(async (args) => {
  if (args.extra && args.extra.query) {
    const query = args.extra.query.toLowerCase();
    const metas = [];
    // Simula busca simples; expanda com scraping real
    if (query.includes('flamengo') || query.includes('futebol')) {
      metas.push({ id: 'tt0111161', type: 'movie', name: 'Tropa de Elite' }); // Ex dublado comum
    }
    return { metas };
  }
  return { metas: [] };
});

builder.defineMetaHandler(async (args) => {
  // Fetch TMDB ou OMDB para meta; simplificado
  return {
    meta: {
      id: args.id,
      type: args.type,
      name: 'Ex: Conteúdo Dublado',
      poster: 'https://via.placeholder.com/300x450?text=Dublado+PT-BR'
    }
  };
});

builder.defineStreamHandler(async (args) => {
  const cacheKey = args.id;
  if (CACHE.has(cacheKey)) return { streams: CACHE.get(cacheKey) };

  const streams = [];
  for (const tracker of TRACKERS) {
    try {
      const res = await axios.get(`${tracker}/search?q=${encodeURIComponent(args.id.replace('tt', ''))}`);
      const $ = cheerio.load(res.data);
      $('.torrent-link').each((i, el) => { // Ajuste selectors reais por site
        const title = $(el).find('.title').text();
        if (title.includes('Dublado') || title.includes('PT-BR')) {
          const magnet = $(el).attr('href'); // Ou extraia magnet
          streams.push({
            name: 'Mico Leão HD',
            url: magnet || `magnet:?xt=urn:btih:exemplohash&dn=${title}`,
            title: title,
            behaviorHints: { bingeGroup: 'torrent' }
          });
        }
      });
    } catch (e) {
      console.error(`Erro em ${tracker}:`, e);
    }
  }

  CACHE.set(cacheKey, streams);
  setTimeout(() => CACHE.delete(cacheKey), 3600000); // 1h cache
  return { streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 11470 });
