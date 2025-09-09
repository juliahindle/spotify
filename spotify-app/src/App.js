import './App.css';
import {useEffect, useState} from 'react';
import './styles.scss';

function App() {

  const clientId = "621b007cf0b14214b779c6c6bee28393";
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const [accessToken, setAccessToken] = useState(params.get("token"));
  const [tracks, setTracks] = useState([]);
  const [artistIds, setArtistIds] = useState([]);
  const [trackToGenres, setTrackToGenres] = useState(null);
  const [genresToCounts, setGenresToCounts] = useState([]);

  ///////// GET TOKEN //////////
  useEffect(() => {
    async function startup() {
      if (!accessToken) {
        if (!code) redirectToAuthCodeFlow(clientId);
        else {
          const token = await getAccessToken(clientId, code);
          setAccessToken(token);
          params.delete("code");
          params.append("token", token);
          window.location.search = params;
        }
      }
    }
    startup();
  }, [code])

  ///////// GET TRACKS //////////
  useEffect(() => {
    async function fetchTracks() {
      let items = [];
      let numResults = 0;
      let offset = 0;

      do {
        // const result = await fetch(`https://api.spotify.com/v1/playlists/0Et0jQNVIQlCakh2jO5t1p/tracks?offset=${offset}&limit=50`, {
        // const result = await fetch(`https://api.spotify.com/v1/playlists/1MLxO6KxxeqOrEEXfXuGPh/tracks?offset=${offset}&limit=50`, {
        const result = await fetch(`https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=50`, {
          method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });
        const json = await result.json();
        numResults = json.items.length;
        offset += 50;
        items = items.concat(json.items.map(item => item.track));
      // } while (numResults === 50 && offset <= 500)
      } while (numResults === 50)
        setTracks(items);
    }
    if (accessToken) fetchTracks();
  }, [accessToken])

  ///////// GET ARTIST IDS //////////
  useEffect(() => {
    if (tracks.length > 0) setArtistIds(Array.from(new Set(tracks.map(track => track.artists.map(artist => artist.id)).flat())));
  }, [tracks])

  ///////// GET GENRES //////////
  useEffect(() => {
    async function fetchGenres() {
      // artist => genres
      const artistToGenres = new Object();
      for (let i = 0; i < artistIds.length; i += 50) {
        const result = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIds.slice(i, i+50).join(",")}`, {
          method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });
        const json = await result.json();
        json.artists.forEach(artist => artistToGenres[artist.id] = artist.genres);
      }
      // track => genres
      const trackToGenre = new Object();
      tracks.forEach((track) => {
        trackToGenre[track.id] = Array.from(new Set(track.artists.map(artist => artistToGenres[artist.id]).flat()));
      })
      setTrackToGenres(trackToGenre);
    }
    if (artistIds.length > 0 && accessToken) fetchGenres();
  }, [artistIds])

  ///////// GET GENRE STATS //////////
  useEffect(() => {
    if (trackToGenres) {
      const genreToCount = new Object();
      Object.values(trackToGenres).flat().forEach((genre) => {
        if (genre in genreToCount) genreToCount[genre]++;
        else genreToCount[genre] = 1;
      });
      setGenresToCounts(Object.entries(genreToCount).sort((a, b) => b[1] - a[1]))
    }
  }, [trackToGenres])
  
  ///////// ON CLICK EVENTS ////////// 
  const onReleasedClick = () => {
    const sortedTracks = [...tracks].sort((a, b) => a.album.release_date.substring(0, 4) - b.album.release_date.substring(0, 4));
    setTracks(sortedTracks);
  }

  ///////// HTML //////////
  return (
    <>
      <header><img src="logo.svg"/>FREE THE DATA</header>
      <main>
        <h2>Decade Stats</h2>
        <p>1940s: {tracks.filter(track => track.album.release_date.startsWith('194')).length}</p>
        <p>1950s: {tracks.filter(track => track.album.release_date.startsWith('195')).length}</p>
        <p>1960s: {tracks.filter(track => track.album.release_date.startsWith('196')).length}</p>
        <p>1970s: {tracks.filter(track => track.album.release_date.startsWith('197')).length}</p>
        <p>1980s: {tracks.filter(track => track.album.release_date.startsWith('198')).length}</p>
        <p>1990s: {tracks.filter(track => track.album.release_date.startsWith('199')).length}</p>
        <p>2000s: {tracks.filter(track => track.album.release_date.startsWith('200')).length}</p>
        <p>2010s: {tracks.filter(track => track.album.release_date.startsWith('201')).length}</p>
        <p>2020s: {tracks.filter(track => track.album.release_date.startsWith('202')).length}</p>
        
        <h2>Genre Stats</h2>
        {genresToCounts.map(genreToCount => <p>{genreToCount[0]}: {genreToCount[1]}</p>)}

        <h2>Tracks</h2>
        <table>
          <tbody>
            <tr>
              <td>Album</td>
              <td>Song</td>
              <td>Artists</td>
              <td>Genres</td>
              <td onClick={onReleasedClick}>Released</td>
            </tr>
            {tracks && tracks.filter(track => track.name).map((track, i) => 
              <tr key={i + JSON.stringify(track)}>
                <td>{track.album.images.length > 0 && <img src={track.album.images[2].url}/>}</td>
                <td>{track.name}</td>
                <td>{track.artists.map((artist) => artist.name).join(", ")}</td>
                <td>{trackToGenres && trackToGenres[track.id].join(", ")}</td>
                <td>{track.album.release_date.substring(0, 4)}</td>
              </tr>
            )}
            </tbody>
        </table>
      </main>
    </>
  );
}

///////////// HELPER FUNCTIONS ///////////////
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "https://freethedata.com");
  params.append("scope", "user-read-private user-read-email user-library-read");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "https://freethedata.com");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const { access_token } = await result.json();
  return access_token;
}

export default App;
