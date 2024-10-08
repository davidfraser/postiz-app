import { AtpAgent } from '@atproto/api';
import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { lookup } from 'mime-types';
import sharp from 'sharp';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import removeMd from 'remove-markdown';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';

export class BlueskyProvider extends SocialAbstract implements SocialProvider {
  identifier = 'bluesky';
  name = 'Bluesky';
  isBetweenSteps = false;
  scopes = [];

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const agent = new AtpAgent({service: 'https://bsky.social'})
    const sessionData = JSON.parse(refreshToken)
    console.log("Bluesky refreshToken `sessionData`")
    const sessionResponse = await agent.resumeSession(sessionData)
    console.log("Bluesky refresh session response `sessionResponse` data `sessionData`")

    return {
        id: sessionData.data.did,
        accessToken: JSON.stringify(sessionData),
        name: sessionResponse.data.email || sessionResponse.data.handle,
        refreshToken: JSON.stringify(sessionData),
        expiresIn: 999999999,
        picture: '',
        username: sessionResponse.data.handle,
    };
  }

  async generateAuthUrl(refresh?: string) {
    /*
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
    });
    const { url, oauth_token, oauth_token_secret } =
      await client.generateAuthLink(
        process.env.FRONTEND_URL +
          `/integrations/social/bluesky${refresh ? `?refresh=${refresh}` : ''}`,
        {
          authAccessType: 'write',
          linkMode: 'authenticate',
          forceLogin: false,
        }
      );
      */
    console.log("Bluesky auth url generation: `refresh`");
    const url = process.env.FRONTEND_URL + '/integrations/social/bluesky'
    return {
      url,
      codeVerifier: '',
      state: '',
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const { code, codeVerifier } = params;
    console.log("Bluesky called authenticate with `params`")
    const [oauth_token, oauth_token_secret] = codeVerifier.split(':');

    const agent = new AtpAgent({service: 'https://bsky.social'});
    
    const bskyHandle = process.env.BLUESKY_HARDCODED_ACCOUNT_ID || '';
    const bskyAppPassword = process.env.BLUESKY_HARDCODED_APP_PASSWORD || '';

    const sessionResponse = await agent.login({identifier: bskyHandle, password: bskyAppPassword});
    console.log("Bluesky Session Response `sessionResponse`")
    if (sessionResponse.data.active === false) {
        throw Error("Error logging in to Bluesky: `sessionResponse.status`")
    }
    
    return {
        id: sessionResponse.data.did,
        accessToken: JSON.stringify(sessionResponse.data),
        name: sessionResponse.data.email || bskyHandle,
        refreshToken: JSON.stringify(sessionResponse.data),
        expiresIn: 999999999,
        picture: '',
        username: sessionResponse.data.handle,
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const agent = new AtpAgent({service: 'https://bsky.social'});
    const sessionData = JSON.parse(accessToken);
    console.log("Bluesky post session data `sessionData`")
    await agent.resumeSession(sessionData);
    console.log("Bluesky resumed session, data `sessionData`")
    const ids: Array<{ postId: string; id: string; releaseURL: string }> = [];
    for (const post of postDetails) {
        console.log("Bluesky posting `post`")
        const postResult: {uri: string, cid: string} = await agent.post({
            text: post.message,
            // TODO: add media using embed
        })
        console.log("Bluesky posted `postResult`")

        ids.push({
            postId: postResult.cid,
            id: post.id,
            releaseURL: postResult.uri,
          });
    }
    return ids.map((p) => ({
      ...p,
      status: 'posted',
    }));
  }
}
