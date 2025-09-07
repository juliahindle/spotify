import './App.css';
import {useEffect, useState} from 'react';

function App() {

  const clientId = "621b007cf0b14214b779c6c6bee28393";
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const [tracks, setTracks] = useState([]);

  useEffect(() => {
    async function startup() {

      if (!code) {
        redirectToAuthCodeFlow(clientId);
      } else {
        alert(code)
        const accessToken = await getAccessToken(clientId, code);
        const fetchedTracks = await fetchTracks(accessToken);
        setTracks(fetchedTracks);
        // populateUI(profile);
      }
    }

    async function getAccessToken(clientId, code) {
      const verifier = localStorage.getItem("verifier");

      const params = new URLSearchParams();
      params.append("client_id", clientId);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", "https://10.0.0.63:3000/callback");
      params.append("code_verifier", verifier);

      const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      });

      const { access_token } = await result.json();
      return access_token;
    }

    async function fetchTracks(token) {
      let items = [];
      let numResults = 0;
      let offset = 0;

      do {
        const result = await fetch(`https://api.spotify.com/v1/playlists/0Et0jQNVIQlCakh2jO5t1p/tracks?offset=${offset}&limit=50`, {
          method: "GET", headers: { Authorization: `Bearer ${token}` }
        });
        const json = await result.json();
        numResults = json.items.length;
        offset += 50;
        items = items.concat(json.items.map(item => item.track))
      } while (numResults === 50)
      

      return items;
    }

    startup();
  }, [code])

  return (<>
    <h1>Liked Songs</h1>
    <table>
      <tbody>
        <tr>
          <td>Album</td>
          <td>Song</td>
          <td>Artists</td>
          <td>Released</td>
        </tr>
        {tracks && tracks.map((track) => 
          <tr>
            <td>{track.album.images.length > 0 && <img src={track.album.images[2].url}/>}</td>
            <td>{track.name}</td>
            <td>{track.artists.map((artist) => artist.name).join(", ")}</td>
            <td>{track.album.release_date.substring(0, 4)}</td>
          </tr>
        )}
        </tbody>
    </table>
</>);
}

///////////// Functions ///////////////
export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "https://10.0.0.63:3000/callback");
  params.append("scope", "user-read-private user-read-email");
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

export default App;
