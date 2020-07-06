// @flow
import * as React from 'react';
import { FormattedMessage } from 'react-intl';
import type { MessageDescriptor } from 'react-intl';
import API from '../../api';
import Notification from '../../components/notification/Notification';
import NotificationsWrapper from '../../components/notification/NotificationsWrapper';
import { convertItemResponse } from '../../features/unified-share-modal/utils/convertData';
import { ACCESS_COLLAB, STATUS_ERROR, TYPE_FILE, TYPE_FOLDER } from '../../constants';
import { CONTENT_SHARING_SHARED_LINK_UPDATE_PARAMS } from './constants';
import contentSharingMessages from './messages';
import type { BoxItemPermission, ItemType, NotificationType } from '../../common/types/core';
import type { item as itemFlowType } from '../../features/unified-share-modal/flowTypes';
import type { ContentSharingItemAPIResponse, ContentSharingSharedLinkType, SharedLinkUpdateFnType } from './types';

type SharingNotificationProps = {
    api: API,
    itemID: string,
    itemPermissions: BoxItemPermission | null,
    itemType: ItemType,
    setItem: ((item: itemFlowType | null) => itemFlowType) => void,
    setOnAddLink: (addLink: SharedLinkUpdateFnType) => void,
    setSharedLink: ((sharedLink: ContentSharingSharedLinkType | null) => ContentSharingSharedLinkType) => void,
};

function SharingNotification({
    api,
    itemID,
    itemPermissions,
    itemType,
    setItem,
    setOnAddLink,
    setSharedLink,
}: SharingNotificationProps) {
    const [notifications, setNotifications] = React.useState<{ [string]: typeof Notification }>({});
    const [notificationID, setNotificationID] = React.useState<number>(0);

    // Close a notification
    const handleNotificationClose = React.useCallback(
        (id: number) => {
            const updatedNotifications = { ...notifications };
            delete updatedNotifications[id];
            setNotifications(updatedNotifications);
        },
        [notifications],
    );

    // Create a notification
    const createNotification = React.useCallback(
        (notificationType: NotificationType, message: MessageDescriptor) => {
            return (
                <Notification
                    duration="short"
                    key={notificationID}
                    onClose={() => handleNotificationClose(notificationID)}
                    type={notificationType}
                >
                    <span>
                        <FormattedMessage {...message} />
                    </span>
                </Notification>
            );
        },
        [handleNotificationClose, notificationID],
    );

    // Generate the onAddLink function for the item
    React.useEffect(() => {
        // Handle successful PUT requests to /files or /folders
        const handleUpdateItemSuccess = (itemData: ContentSharingItemAPIResponse) => {
            const { item: updatedItem, sharedLink: updatedSharedLink } = convertItemResponse(itemData);
            setItem((prevItem: itemFlowType | null) => ({ ...prevItem, ...updatedItem }));
            setSharedLink((prevSharedLink: ContentSharingSharedLinkType | null) => ({
                ...prevSharedLink,
                ...updatedSharedLink,
            }));
        };

        // Handle failed PUT requests to /files or /folders
        const handleUpdateItemError = () => {
            const updatedNotifications = { ...notifications };
            updatedNotifications[notificationID] = createNotification(
                STATUS_ERROR,
                contentSharingMessages.sharedLinkUpdateError,
            );
            setNotifications(updatedNotifications);
            setNotificationID(notificationID + 1);
        };

        if (itemPermissions) {
            const dataForAPI = {
                id: itemID,
                permissions: itemPermissions,
            };

            let itemAPIInstance;
            if (itemType === TYPE_FILE) {
                itemAPIInstance = api.getFileAPI();
            } else if (itemType === TYPE_FOLDER) {
                itemAPIInstance = api.getFolderAPI();
            }

            const updatedOnAddLink: SharedLinkUpdateFnType = () => () =>
                itemAPIInstance.share(
                    dataForAPI,
                    ACCESS_COLLAB,
                    handleUpdateItemSuccess,
                    handleUpdateItemError,
                    CONTENT_SHARING_SHARED_LINK_UPDATE_PARAMS,
                );
            setOnAddLink(updatedOnAddLink);
        }
    }, [
        api,
        createNotification,
        itemID,
        itemPermissions,
        itemType,
        notificationID,
        notifications,
        setItem,
        setOnAddLink,
        setSharedLink,
    ]);

    return (
        <NotificationsWrapper>
            <>{[...Object.values(notifications)]}</>
        </NotificationsWrapper>
    );
}

export default SharingNotification;
