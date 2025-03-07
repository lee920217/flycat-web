import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { BaseLayout, Left } from 'components/BaseLayout';
import { RelayPoolManager } from './RelayPool';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { RelayGroup } from './RelyaGroup';
import {RelayGroup as RelayGroupClass} from 'core/relay/group';
import styles from './index.module.scss';
import Icon from 'components/Icon';
import { useDefaultGroup } from './hooks/useDefaultGroup';
import { useReadonlyMyPublicKey } from 'hooks/useMyPublicKey';
import { useLoadRelayGroup } from './hooks/useLoadRelayGroup';

export interface RelayMenuProp {
  showRelayPool: boolean;
  setShowRelayPool: any;
}

export const RelayMenu: React.FC<RelayMenuProp> = ({
  showRelayPool,
  setShowRelayPool,
}) => {
  return showRelayPool ? (
    <div className={styles.header} onClick={() => setShowRelayPool(false)}>
        <Icon type="icon-arrow-left" className={styles.icon} />
        <div className={styles.title}>Browse all relays</div>
      </div>
  ) : (
    <div className={styles.pageTitle}>
      <div className={styles.title}>Relays</div>
      <div className={styles.btn} onClick={() => setShowRelayPool(true)}>
        Explore 500+ relays
      </div>
    </div>
  );
};

export function RelayManager() {
  const { t } = useTranslation();

  const myPublicKey = useReadonlyMyPublicKey();
  const [showRelayPool, setShowRelayPool] = useState(false);
  const [groups, setGroups] = useState<RelayGroupClass>();

  const defaultGroup = useDefaultGroup();
  useLoadRelayGroup({myPublicKey, defaultGroup, setGroups});

  return (
    <BaseLayout>
      <Left>
        <RelayMenu
          setShowRelayPool={setShowRelayPool}
          showRelayPool={showRelayPool}
        />
        {!showRelayPool && <RelayGroup groups={groups} setGroups={setGroups} />}
        {showRelayPool && <RelayPoolManager groups={groups} setGroups={setGroups} />}
      </Left>
    </BaseLayout>
  );
}

export default RelayManager;

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common'])),
  },
});
