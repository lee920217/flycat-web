import { useState } from 'react';

import { Nip23 } from 'core/nip/23';
import { Nip9802 } from 'core/nip/9802';
import { EventMap, UserMap } from 'core/nostr/type';
import {Event} from 'core/nostr/Event';
import { CallWorker } from 'core/worker/caller';
import { EventWithSeen } from 'pages/type';

import styles from './index.module.scss';
import PostUser from './PostUser';
import PostReactions from './PostReactions';
import PostArticle from './PostArticle';
import { PostContent } from './PostContent';
import { Nip18 } from 'core/nip/18';
import PostRepost from './PostRepost';
import { toUnSeenEvent } from 'core/nostr/util';
import PostArticleComment from './PostArticleComment';
import { Paths } from 'constants/path';
import { PostCommunityHeader } from './PostCommunityHeader';
import {
  message,
  Button,
  Modal
} from 'antd';
import Icon from "../Icon";
import PubNoteTextarea from "../PubNoteTextarea";
import {Nip172} from "../../core/nip/172";


interface PostItemsProps {
  msgList: EventWithSeen[];
  worker: CallWorker;
  userMap: UserMap;
  eventMap: EventMap;
  relays: string[];
  showLastReplyToEvent?: boolean;
  showFromCommunity?: boolean;
  extraMenu?: {
    label: string;
    onClick: (event: Event, msg: typeof message) => any;
  }[];
  extraHeader?: React.ReactNode;
  communityId?: string
}

const PostItems: React.FC<PostItemsProps> = ({
  msgList,
  worker,
  userMap,
  eventMap,
  relays,
  showLastReplyToEvent = true,
  showFromCommunity = true,
  extraMenu,
  extraHeader,
  communityId= ""
}) => {
  const [activeTab, setActiveTab] = useState('Latest');
  const getUser = (msg: EventWithSeen) => userMap.get(msg.pubkey);

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };


  return (
    <>
      {msgList.map(msg =>
        Nip18.isRepostEvent(msg) ? (
          <PostRepost
            event={msg}
            userMap={userMap}
            worker={worker}
            eventMap={eventMap}
            showLastReplyToEvent={showLastReplyToEvent}
            key={msg.id}
          />
        ) : (
          <div className={styles.post} key={msg.id}>
            {extraHeader}
            {showFromCommunity && <PostCommunityHeader event={msg} />}
            <div className={styles.communityIdWrapper}>
              <span>From</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.06985 15.1504C2.27561 15.3681 2.52666 15.5381 2.80528 15.6482C3.0839 15.7584 3.3833 15.8061 3.68235 15.7879C4.55919 15.742 5.41823 15.5227 6.20985 15.1429C7.39619 15.6745 8.71081 15.8522 9.99573 15.6547C11.2807 15.4572 12.4812 14.8928 13.4531 14.0295C14.425 13.1661 15.1269 12.0404 15.4745 10.7877C15.822 9.535 15.8005 8.20859 15.4123 6.96787C16.3948 5.29537 16.7248 3.77287 15.9148 2.85787C15.6794 2.58478 15.3805 2.37361 15.0445 2.24285C14.7084 2.1121 14.3455 2.06575 13.9873 2.10787C13.2775 2.21614 12.6138 2.52591 12.0748 3.00037C10.865 2.38567 9.498 2.14991 8.15216 2.32384C6.80632 2.49777 5.54416 3.07331 4.53035 3.97538C3.51654 4.87744 2.79816 6.06414 2.46895 7.38063C2.13973 8.69713 2.21497 10.0823 2.68485 11.3554C1.88985 12.2629 1.14735 14.1154 2.06985 15.1504ZM3.19485 14.1604C3.02985 13.9729 3.19485 13.3579 3.47235 12.8404C3.80799 13.3235 4.20366 13.762 4.64985 14.1454C3.87735 14.3704 3.36735 14.3554 3.19485 14.1604ZM14.0773 10.2829C13.7369 11.6297 12.8766 12.7866 11.6848 13.5004C10.872 13.9837 9.94547 14.2425 8.99985 14.2504C8.68742 14.248 8.37596 14.2154 8.06985 14.1529C9.2465 13.4313 10.356 12.6055 11.3848 11.6854C12.4208 10.7706 13.3744 9.7668 14.2348 8.68537C14.266 9.22282 14.2129 9.76184 14.0773 10.2829ZM14.1448 3.61537C14.2651 3.59558 14.3884 3.60728 14.5027 3.64934C14.6171 3.6914 14.7186 3.76239 14.7973 3.85537C14.9698 4.05037 14.9173 4.56037 14.6023 5.30287C14.2641 4.78591 13.858 4.31672 13.3948 3.90787C13.6205 3.75679 13.8765 3.65695 14.1448 3.61537ZM3.91485 7.73287C4.07931 7.06231 4.37555 6.43118 4.78629 5.87622C5.19704 5.32126 5.7141 4.85356 6.30735 4.50037C7.12059 4.01167 8.05106 3.75248 8.99985 3.75037C9.90842 3.7441 10.8026 3.97716 11.5926 4.4261C12.3825 4.87505 13.0403 5.52405 13.4998 6.30787C13.5991 6.46635 13.6868 6.63178 13.7623 6.80287C12.7978 8.18616 11.6668 9.44561 10.3948 10.5529C9.14469 11.7027 7.75657 12.6927 6.26235 13.5004C5.31273 12.917 4.57339 12.0466 4.15136 11.0151C3.72932 9.9836 3.64649 8.84457 3.91485 7.76287V7.73287Z" fill="#598022"/>
              </svg>
              <span className={styles.communityIdContent}>{communityId}</span>
            </div>
            <PostUser
              publicKey={msg.pubkey}
              avatar={getUser(msg)?.picture || ''}
              name={getUser(msg)?.name}
              time={msg.created_at}
              event={msg}
              extraMenu={extraMenu}
            />
            <div className={styles.content}>
              {Nip23.isBlogPost(msg) ? (
                <PostArticle
                  userAvatar={getUser(msg)?.picture || ''}
                  userName={getUser(msg)?.name || ''}
                  event={msg}
                  key={msg.id}
                />
              ) : Nip23.isBlogCommentMsg(msg) ? (
                <PostArticleComment
                  userMap={userMap}
                  eventMap={eventMap}
                  event={msg}
                  worker={worker}
                  key={msg.id}
                  showReplyArticle={showLastReplyToEvent}
                />
              ) : Nip9802.isBlogHighlightMsg(msg) ? (
                <>HighlightMsg</>
              ) : (
                <PostContent
                  ownerEvent={msg}
                  userMap={userMap}
                  worker={worker}
                  eventMap={eventMap}
                  showLastReplyToEvent={showLastReplyToEvent}
                />
              )}
              <PostReactions
                ownerEvent={toUnSeenEvent(msg)}
                worker={worker}
                seen={msg.seen!}
                userMap={userMap}
              />
            </div>
          </div>
        ),
      )}
    </>
  );
};

export default PostItems;
