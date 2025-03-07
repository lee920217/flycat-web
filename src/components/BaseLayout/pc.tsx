import { Paths } from 'constants/path';
import { useRouter } from 'next/router';
import { RootState } from 'store/configureStore';
import { useDispatch, useSelector } from 'react-redux';
import { useMatchPad } from 'hooks/useMediaQuery';
import { MenuItemType } from 'antd/es/menu/hooks/useItems';
import { UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useReadonlyMyPublicKey } from 'hooks/useMyPublicKey';
import { EventSetMetadataContent } from 'core/nostr/type';
import { Avatar, Badge, Button, Dropdown } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { MenuId, NavMenus, UserMenus, navClick } from './utils';

import Link from 'next/link';
import Icon from 'components/Icon';
import styles from './index.module.scss';
import dynamic from 'next/dynamic';
import { useNotification } from 'hooks/useNotification';
import { shortifyPublicKey } from 'core/nostr/content';

const PcPadNav = ({ user, setOpenWrite }: { user?: EventSetMetadataContent, setOpenWrite: Dispatch<SetStateAction<boolean>> }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const isPad = useMatchPad();
  const router = useRouter();
  const myPublicKey = useReadonlyMyPublicKey();
  const isLoggedIn = useSelector((state: RootState) => state.loginReducer.isLoggedIn);
  const isNewUnread = useNotification();
  const doLogout = () => {
    dispatch({
      type: 'LOGOUT',
    });
    window.location.href = Paths.login;
  }
  
  const userMenus = UserMenus.reduce((result, item) => {
    if (!item || item.id === MenuId.bookmarks) return result;

    result.push({
      icon: item?.icon,
      key: item?.id,
      label: t(item?.title),
      onClick: () => item.id === MenuId.signOut ? doLogout() : navClick(item, myPublicKey, router, isLoggedIn, t),
    });
    return result;
  }, [] as MenuItemType[]);

  return (
    <nav className={styles.pcPadNav}>
      <div className={styles.logo}>
        <Link href={Paths.home}>
          <img src="/logo512.png" alt="logo" />
        </Link>
      </div>
      <ul>
        <li>
          { 
            <Dropdown 
            menu={{ items: isLoggedIn ? userMenus : [] }} 
            overlayClassName={styles.pcPadNavUserMenu}
            placement='bottom'
            arrow
          >
            <div className={styles.user} onClick={() => isLoggedIn ? null : router.push({ pathname: Paths.login })}>
              { user ? <Avatar src={user.picture} /> : <Avatar icon={<UserOutlined />} /> }
              <h1>{ isLoggedIn ?  user?.name || shortifyPublicKey(myPublicKey) : t('nav.menu.signIn')}</h1>
            </div>
          </Dropdown>
          }
        </li>
        { NavMenus.map((item, key) => (
            <li 
              key={key} 
              className={router.pathname === item.link ? styles.active : ''}
              onClick={() => navClick(item, myPublicKey, router, isLoggedIn, t)}
            >{ item.icon }{item.id === MenuId.notifications && isNewUnread ? <Badge dot><span>{ t(item.title) }</span></Badge> : <span>{ t(item.title) }</span>}
            </li>
          )
        )}
      </ul>
      <Button
        block={isPad ? false : true}
        type="primary"
        shape={isPad ? "circle" : 'default'}
        icon={isPad ? <Icon type='icon-Pencil' /> : null}
        onClick={() => setOpenWrite(true)}
        disabled={!isLoggedIn}
      >
        { !isPad && t('nav.menu.blogDashboard') }
      </Button>
    </nav>
  )
};

export default dynamic(() => Promise.resolve(PcPadNav), {
  ssr: false,
});
