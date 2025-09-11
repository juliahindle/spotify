import './App.css';
import {useEffect, useState} from 'react';
import './styles.scss';

function App() {

  const params = new URLSearchParams(window.location.search);

  const [accessToken, setAccessToken] = useState(params.get("token"));
  const [playlist, setPlaylist] = useState("0Et0jQNVIQlCakh2jO5t1p");
  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [artistIdsProcessed, setArtistIdsProcessed] = useState([]);
  const [trackToGenres, setTrackToGenres] = useState(null);
  const [genresToCounts, setGenresToCounts] = useState([]);

  ///////// GET TOKEN //////////
  useEffect(() => {
    async function getAccessToken() {
      if (!accessToken) {
        let params = new URLSearchParams();
        params.append("client_id", "621b007cf0b14214b779c6c6bee28393");
        params.append("grant_type", "client_credentials");
        params.append("client_secret", "76f1bfae588743efbaf4723a6c06920d");
        
        const result = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {"Content-Type": "application/x-www-form-urlencoded"},
          body: params
        });

        const { access_token } = await result.json();
        setAccessToken(access_token);
        params = new URLSearchParams();
        params.append("token", access_token);
        window.location.search = params;
      }
    }

    getAccessToken();
  }, [])

  ///////// GET TRACKS //////////
  useEffect(() => {
    async function fetchTracks() {
      let items = [];
      let numResults = 0;
      let offset = 0;

      do {
        const result = await fetch(`https://api.spotify.com/v1/playlists/${playlist}/tracks?offset=${offset}&limit=50`, {
        // const result = await fetch(`https://api.spotify.com/v1/playlists/1MLxO6KxxeqOrEEXfXuGPh/tracks?offset=${offset}&limit=50`, {
        // const result = await fetch(`https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=50`, {
          method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });
        const json = await result.json();
        numResults = json.items.length;
        offset += 50;
        items = items.concat(json.items.map(item => item.track));
        setTracks(items);
      } while (numResults === 50)
    }

    if (accessToken, playlist) fetchTracks();
  }, [accessToken, playlist])

  ///////// GET ARTISTS //////////
  useEffect(() => {
    async function fetchArtists() {
      const allArtistIds = Array.from(new Set(tracks.map(track => track.artists.map(artist => artist.id)).flat()));
      const newArtistIds = allArtistIds.filter(id => !artistIdsProcessed.includes(id));

      for (let i = 0; i < newArtistIds.length; i += 50) {
        const result = await fetch(`https://api.spotify.com/v1/artists?ids=${newArtistIds.slice(i, i+50).join(",")}`, {
          method: "GET", headers: { Authorization: `Bearer ${accessToken}` }
        });
        const json = await result.json();
        
        setArtists(artists => [...artists].concat(json.artists));
        setArtistIdsProcessed(artistIdsProcessed => [...artistIdsProcessed].concat(newArtistIds.slice(i, i+50)));
      }
    }

    if (tracks.length > 0) fetchArtists();
  }, [tracks])

  ///////// GET GENRES //////////
  useEffect(() => {
    const artistToGenres = new Object();
    artists.forEach(artist => artistToGenres[artist.id] = artist.genres);

    const trackToGenre = structuredClone(trackToGenres) || new Object();
    
    tracks.forEach((track) => {
      if (!trackToGenre || !trackToGenre[track.id] || trackToGenre[track.id].includes(undefined)) {
        trackToGenre[track.id] = Array.from(new Set(track.artists.map(artist => artistToGenres[artist.id]).flat()));
      }
    })

    setTrackToGenres(trackToGenre);
  }, [artists])

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
      <header><img className="logo" src="logo.svg"/>FREE THE STATS</header>
      <main>
        <section className="decades">
          <h2>Decade Stats</h2>
          <div className="scroll-list">
            <p>1940s: {tracks.filter(track => track.album.release_date.startsWith('194')).length}</p>
            <p>1950s: {tracks.filter(track => track.album.release_date.startsWith('195')).length}</p>
            <p>1960s: {tracks.filter(track => track.album.release_date.startsWith('196')).length}</p>
            <p>1970s: {tracks.filter(track => track.album.release_date.startsWith('197')).length}</p>
            <p>1980s: {tracks.filter(track => track.album.release_date.startsWith('198')).length}</p>
            <p>1990s: {tracks.filter(track => track.album.release_date.startsWith('199')).length}</p>
            <p>2000s: {tracks.filter(track => track.album.release_date.startsWith('200')).length}</p>
            <p>2010s: {tracks.filter(track => track.album.release_date.startsWith('201')).length}</p>
            <p>2020s: {tracks.filter(track => track.album.release_date.startsWith('202')).length}</p>
          </div>
        </section>
        
        <section className="genres">
          <h2>Genre Stats</h2>
          <div className="scroll-list">
            {genresToCounts.map(genreToCount => <p>{genreToCount[0]}: {genreToCount[1]}</p>)}
          </div>
        </section>

        <section className="tracks">
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
                  <td>{trackToGenres && trackToGenres[track.id] && trackToGenres[track.id].join(", ")}</td>
                  <td>{track.album.release_date.substring(0, 4)}</td>
                </tr>
              )}
              </tbody>
          </table>
        </section>
        
      </main>
    </>
  );
}

export default App;
