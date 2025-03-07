import { CommunityMetadata, Nip172 } from 'core/nip/172';
import styles from '../index.module.scss';
import {
  Avatar,
  Button,
  Divider,
  Empty,
  Modal,
  Segmented,
  Tooltip,
  message,
} from 'antd';
import {
  EventId,
  EventMap,
  EventSetMetadataContent,
  UserMap,
  WellKnownEventKind,
} from 'core/nostr/type';
import { CallWorker } from 'core/worker/caller';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { EventWithSeen } from 'pages/type';
import { CallRelayType } from 'core/worker/type';
import { isEventPTag } from 'core/nostr/util';
import { deserializeMetadata } from 'core/nostr/content';
import PostItems from 'components/PostItems';
import Icon from 'components/Icon';
import PubNoteTextarea from 'components/PubNoteTextarea';
import { useReadonlyMyPublicKey } from 'hooks/useMyPublicKey';
import { useSelector } from 'react-redux';
import { RootState } from 'store/configureStore';
import { Event } from 'core/nostr/Event';
import { noticePubEventResult } from 'components/PubEventNotice';
import {
  createFollowContactEvent,
  createInitialFollowContactEvent,
  createUnFollowContactEvent,
  isFollowed,
  updateMyContactEvent,
} from 'core/worker/util';
import { RawEvent } from 'core/nostr/RawEvent';

interface CommunityProps {
  community: CommunityMetadata;
  userMap: UserMap;
  eventMap: EventMap;
  worker?: CallWorker;
  setUserMap: Dispatch<SetStateAction<UserMap>>;
  setEventMap: Dispatch<SetStateAction<EventMap>>;
}
export function Community({
  community,
  userMap,
  worker,
  eventMap,
  setEventMap,
  setUserMap,
}: CommunityProps) {
  const myPublicKey = useReadonlyMyPublicKey();
  const [myContactEvent, setMyContactEvent] = useState<Event>();
  const [msgList, setMsgList] = useState<EventWithSeen[]>([]);
  const [allMsgList, setAllMsgList] = useState<EventWithSeen[]>([]);
  const [loading, setLoading] = useState(false);
  const [openWrite, setOpenWrite] = useState(false);
  const [selectTab, setSelectTab] = useState<string | number>();

  const signEvent = useSelector(
    (state: RootState) => state.loginReducer.signEvent,
  );

  useEffect(() => {
    getApprovalShortNoteId();
  }, [worker, community]);

  useEffect(() => {
    if (!worker) return;
    if (myPublicKey.length === 0) return;

    updateMyContactEvent({ worker, pk: myPublicKey, setMyContactEvent });
  }, [myPublicKey, worker]);

  const target: { type: 'people' | 'hashTag' | 'community'; data: string } = {
    type: 'community',
    data: Nip172.communityAddr({
      identifier: community.id,
      author: community.creator,
    }),
  };
  const follow = async () => {
    if (!signEvent) return message.error('no sign method');
    if (!worker) return message.error('no worker!');

    let rawEvent: RawEvent | null = null;
    if (myContactEvent) {
      rawEvent = createFollowContactEvent(myContactEvent, target);
    } else {
      const isConfirmed = window.confirm(
        'hey you have 0 followings, are you sure to continue? \n\n(if you think 0 followings is a wrong, please click CANCEL and try again, otherwise you might lost all your following!)',
      );
      if (!isConfirmed) return;
      rawEvent = createInitialFollowContactEvent(target);
    }

    const event = await signEvent(rawEvent);
    const handler = worker.pubEvent(event);
    return noticePubEventResult(handler, () =>
      updateMyContactEvent({ worker, pk: myPublicKey, setMyContactEvent }),
    );
  };
  const unfollow = async () => {
    if (!signEvent) return message.error('no sign method');
    if (!worker) return message.error('no worker!');
    if (!myContactEvent) return message.error('contact event not found!');
    const rawEvent = createUnFollowContactEvent(myContactEvent, target);
    const event = await signEvent(rawEvent);
    const handler = worker.pubEvent(event);
    return noticePubEventResult(handler, () =>
      updateMyContactEvent({ worker, pk: myPublicKey, setMyContactEvent }),
    );
  };
  const actionText =
    myContactEvent && isFollowed(myContactEvent, target)
      ? 'Unfollow'
      : 'Follow';
  const actionOnClick =
    myContactEvent && isFollowed(myContactEvent, target) ? unfollow : follow;
  const actionButton = (
    <Button type="primary" onClick={actionOnClick} disabled={!signEvent}>
      {actionText}
    </Button>
  );

  const getApprovalShortNoteId = async () => {
    if (!worker) return;
    setMsgList([]);
    const ids: EventId[] = [];

    const handleEvent = (event, relayUrl) => {
      switch (event.kind) {
        case WellKnownEventKind.set_metadata:
          const metadata: EventSetMetadataContent = deserializeMetadata(
            event.content,
          );
          setUserMap(prev => {
            const newMap = new Map(prev);
            const oldData = newMap.get(event.pubkey) as { created_at: number };
            if (oldData && oldData.created_at > event.created_at) {
              // the new data is outdated
              return newMap;
            }

            newMap.set(event.pubkey, {
              ...metadata,
              ...{ created_at: event.created_at },
            });
            return newMap;
          });
          break;

        case WellKnownEventKind.text_note:
          setEventMap(prev => {
            prev.set(event.id, event);
            return prev;
          });
          if (!Nip172.isCommunityPost(event)) return;
          setMsgList(oldArray => {
            if (!oldArray.map(e => e.id).includes(event.id)) {
              // do not add duplicated msg

              // check if need to sub new user metadata
              const newPks: string[] = [];
              if (userMap.get(event.pubkey) == null) {
                newPks.push(event.pubkey);
              }
              for (const t of event.tags) {
                if (isEventPTag(t)) {
                  const pk = t[1];
                  if (userMap.get(pk) == null) {
                    newPks.push(pk);
                  }
                }
              }
              if (newPks.length > 0) {
                const sub = worker?.subMetadata(newPks, undefined, {
                  type: CallRelayType.single,
                  data: [relayUrl!],
                });
                sub?.iterating({ cb: handleEvent });
              }

              // save event
              const newItems = [
                ...oldArray,
                { ...event, ...{ seen: [relayUrl!] } },
              ];
              // sort by timestamp
              const sortedItems = newItems.sort((a, b) =>
                a.created_at >= b.created_at ? -1 : 1,
              );
              return sortedItems;
            } else {
              const id = oldArray.findIndex(s => s.id === event.id);
              if (id === -1) return oldArray;

              if (!oldArray[id].seen?.includes(relayUrl!)) {
                oldArray[id].seen?.push(relayUrl!);
              }
            }
            return oldArray;
          });
          break;

        default:
          break;
      }
    };

    setLoading(true);
    const filter = Nip172.approvalFilter({
      identifier: community.id,
      author: community.creator,
      moderators: community.moderators,
    });
    const dataStream = worker.subFilter({ filter }).getIterator();
    for await (const data of dataStream) {
      const id = Nip172.shortNoteIdFromApproval({ approvalEvent: data.event });

      const event = Nip172.parseNoteFromApproval(data.event);

      if (event != null) {
        console.log(event);
        setMsgList(oldArray => {
          if (event == null) return oldArray; //todo:fix this, very strange

          if (!oldArray.map(e => e.id).includes(event.id)) {
            // do not add duplicated msg

            // check if need to sub new user metadata
            const newPks: string[] = [];
            if (userMap.get(event.pubkey) == null) {
              newPks.push(event.pubkey);
            }
            for (const t of event.tags) {
              if (isEventPTag(t)) {
                const pk = t[1];
                if (userMap.get(pk) == null) {
                  newPks.push(pk);
                }
              }
            }
            if (newPks.length > 0) {
              worker
                .subMetadata(newPks, undefined, {
                  type: CallRelayType.single,
                  data: [data.relayUrl!],
                })
                .iterating({ cb: handleEvent });
            }

            // save event
            const newItems = [
              ...oldArray,
              { ...event, ...{ seen: [data.relayUrl!] } }, // todo: this relay url is not the target event's relay
            ];
            // sort by timestamp
            const sortedItems = newItems.sort((a, b) =>
              a.created_at >= b.created_at ? -1 : 1,
            );
            return sortedItems;
          } else {
            const id = oldArray.findIndex(s => s.id === event.id);
            if (id === -1) return oldArray;

            if (!oldArray[id].seen?.includes(data.relayUrl!)) {
              oldArray[id].seen?.push(data.relayUrl!);
            }
          }
          return oldArray;
        });
        continue;
      }

      if (id && !ids.includes(id)) ids.push(id);
    }
    dataStream.unsubscribe();

    if (ids.length === 0) return setLoading(false);

    worker.subMsgByEventIds(ids).iterating({ cb: handleEvent });
    setLoading(false);
  };

  const getAllShortNoteId = async () => {
    if (!worker) return;
    setAllMsgList([]);

    const handleEvent = (event, relayUrl) => {
      switch (event.kind) {
        case WellKnownEventKind.set_metadata:
          const metadata: EventSetMetadataContent = deserializeMetadata(
            event.content,
          );
          setUserMap(prev => {
            const newMap = new Map(prev);
            const oldData = newMap.get(event.pubkey) as { created_at: number };
            if (oldData && oldData.created_at > event.created_at) {
              // the new data is outdated
              return newMap;
            }

            newMap.set(event.pubkey, {
              ...metadata,
              ...{ created_at: event.created_at },
            });
            return newMap;
          });
          break;

        case WellKnownEventKind.text_note:
          setEventMap(prev => {
            prev.set(event.id, event);
            return prev;
          });
          if (!Nip172.isCommunityPost(event)) return;

          setAllMsgList(oldArray => {
            if (!oldArray.map(e => e.id).includes(event.id)) {
              // do not add duplicated msg

              // check if need to sub new user metadata
              const newPks: string[] = [];
              if (userMap.get(event.pubkey) == null) {
                newPks.push(event.pubkey);
              }
              for (const t of event.tags) {
                if (isEventPTag(t)) {
                  const pk = t[1];
                  if (userMap.get(pk) == null) {
                    newPks.push(pk);
                  }
                }
              }
              if (newPks.length > 0) {
                const sub = worker?.subMetadata(newPks, undefined, {
                  type: CallRelayType.single,
                  data: [relayUrl!],
                });
                sub?.iterating({ cb: handleEvent });
              }

              // save event
              const newItems = [
                ...oldArray,
                { ...event, ...{ seen: [relayUrl!] } },
              ];
              // sort by timestamp
              const sortedItems = newItems.sort((a, b) =>
                a.created_at >= b.created_at ? -1 : 1,
              );
              return sortedItems;
            } else {
              const id = oldArray.findIndex(s => s.id === event.id);
              if (id === -1) return oldArray;

              if (!oldArray[id].seen?.includes(relayUrl!)) {
                oldArray[id].seen?.push(relayUrl!);
              }
            }
            return oldArray;
          });
          break;

        default:
          break;
      }
    };

    const filter = Nip172.allPostsFilter({
      identifier: community.id,
      author: community.creator,
    });
    console.log('filter:', filter);
    worker.subFilter({ filter }).iterating({ cb: handleEvent });
  };

  useEffect(() => {
    if (selectTab === 'un-approval') {
      getAllShortNoteId();
    }
  }, [selectTab, community]);

  const isModerator = community.moderators.includes(myPublicKey);
  const unApprovalMsgList = allMsgList.filter(
    msg => !msgList.map(m => m.id).includes(msg.id),
  );

  const createApproval = async (postEvent: Event, message) => {
    if (!worker) return message.error('worker not found');
    if (!signEvent) return message.errpr('signEvent method not found');

    const rawEvent = Nip172.createApprovePostRawEvent(
      postEvent,
      community.id,
      community.creator,
    );
    const event = await signEvent(rawEvent);
    const handle = worker.pubEvent(event);
    noticePubEventResult(handle, () => getApprovalShortNoteId());
  };

  return (
    <>
      <div className={styles.communityPage}>
        <img src={community.image} alt="" className={styles.banner} />
        <div className={styles.title}>{community.id}</div>
        <div className={styles.description}>{community.description}</div>
        <div className={styles.ruleTitle}>Rules</div>
        <div className={styles.rules}>{community.rules}</div>
        <div className={styles.moderator}>
          <div>
            <Tooltip
              key={community.creator}
              title={userMap.get(community.creator)?.name}
              placement="top"
            >
              <Avatar src={userMap.get(community.creator)?.picture} />
            </Tooltip>

            <Avatar.Group maxCount={5}>
              {community.moderators.map(pk => (
                <Tooltip key={pk} title={userMap.get(pk)?.name} placement="top">
                  <a href={'/user/' + pk}>
                    <Avatar src={userMap.get(pk)?.picture} />
                  </a>
                </Tooltip>
              ))}
            </Avatar.Group>
          </div>
          <div>{actionButton}</div>
        </div>
        <Divider orientation="left"></Divider>
        <div className={styles.selectBtn}>
          <Segmented
            value={selectTab}
            onChange={val => setSelectTab(val)}
            options={[
              { label: 'Latest', value: 'latest', disabled: false },
              { label: 'Pin', value: 'hotest', disabled: true },
              { label: 'UnApproval', value: 'un-approval' },
            ]}
          />
          <Button type="link" onClick={() => setOpenWrite(true)}>
            Create Post
          </Button>
          <Modal
            title={'Post to ' + community.id}
            wrapClassName={styles.modal}
            footer={null}
            open={openWrite}
            onCancel={() => setOpenWrite(false)}
            closeIcon={
              <Icon type="icon-cross" className={styles.modalCoseIcons} />
            }
          >
            <p>
              {
                'Your post will show up in your profile, but it needs to be approved by moderator to show up in the community'
              }
            </p>
            <PubNoteTextarea
              activeCommunity={Nip172.communityAddr({
                identifier: community.id,
                author: community.creator,
              })}
            />
          </Modal>
        </div>
      </div>

      {selectTab === 'un-approval' && (
        <>
          {unApprovalMsgList.length === 0 && <Empty />}
          <PostItems
            msgList={unApprovalMsgList}
            worker={worker!}
            userMap={userMap}
            eventMap={eventMap}
            relays={worker?.relays.map(r => r.url) || []}
            showFromCommunity={false}
            extraMenu={
              isModerator
                ? [
                    {
                      label: 'approve this event',
                      onClick: (event, message) =>
                        createApproval(event, message),
                    },
                  ]
                : []
            }
          />
        </>
      )}

      {selectTab !== 'un-approval' && (
        <>
          {msgList.length === 0 && <Empty />}
          <PostItems
            msgList={msgList}
            worker={worker!}
            userMap={userMap}
            eventMap={eventMap}
            relays={worker?.relays.map(r => r.url) || []}
            showFromCommunity={false}
          />
        </>
      )}
    </>
  );
}
