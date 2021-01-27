// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/** @jsx jsx */
import { jsx } from '@emotion/core';
import React, { useMemo, useCallback } from 'react';
import formatMessage from 'format-message';
import get from 'lodash/get';
import { getEditorAPI } from '@bfc/shared';
import { useRecoilValue } from 'recoil';

import { Toolbar, IToolbarItem } from '../../components/Toolbar';
import { createDiagnosticsPageUrl, navigateTo } from '../../utils/navigation';
import {
  visualEditorSelectionState,
  dispatcherState,
  rootBotProjectIdSelector,
  currentDialogState,
} from '../../recoilModel';
import { undoFunctionState } from '../../recoilModel/undo/history';
import { undoStatusSelectorFamily } from '../../recoilModel/selectors/undo';
import { DiagnosticsHeader } from '../../components/DiagnosticsHeader';
import TelemetryClient from '../../telemetry/TelemetryClient';

type CommandBarProps = { dialogId?: string; projectId: string };

const CommandBar: React.FC<CommandBarProps> = ({ dialogId, projectId }) => {
  const currentDialog = useRecoilValue(currentDialogState({ dialogId, projectId }));
  const { undo, redo } = useRecoilValue(undoFunctionState(projectId));
  const rootProjectId = useRecoilValue(rootBotProjectIdSelector) ?? projectId;
  const visualEditorSelection = useRecoilValue(visualEditorSelectionState);
  const [canUndo, canRedo] = useRecoilValue(undoStatusSelectorFamily(projectId));

  const { onboardingAddCoachMarkRef } = useRecoilValue(dispatcherState);

  const { actionSelected, showDisableBtn, showEnableBtn } = useMemo(() => {
    const actionSelected = Array.isArray(visualEditorSelection) && visualEditorSelection.length > 0;
    if (!actionSelected) {
      return { actionSelected: false, showDisableBtn: false, showEnableBtn: false };
    }
    const selectedActions = visualEditorSelection.map((id) => get(currentDialog?.content, id));
    const showDisableBtn = selectedActions.some((x) => get(x, 'disabled') !== true);
    const showEnableBtn = selectedActions.some((x) => get(x, 'disabled') === true);

    return { actionSelected, showDisableBtn, showEnableBtn };
  }, [visualEditorSelection, currentDialog?.content]);

  const EditorAPI = getEditorAPI();

  const toolbarItems: IToolbarItem[] = [
    {
      type: 'element',
      element: <DiagnosticsHeader onClick={() => navigateTo(createDiagnosticsPageUrl(rootProjectId))} />,
      align: 'right',
    },
    {
      type: 'dropdown',
      text: formatMessage('Edit'),
      align: 'left',
      dataTestid: 'EditFlyout',
      buttonProps: {
        iconProps: { iconName: 'Edit' },
      },
      menuProps: {
        onMenuOpened: () => {
          TelemetryClient.track('ToolbarButtonClicked', { name: 'edit' });
        },
        items: [
          {
            key: 'edit.undo',
            text: formatMessage('Undo'),
            disabled: !canUndo,
            onClick: () => {
              undo();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'undo' });
            },
          },
          {
            key: 'edit.redo',
            text: formatMessage('Redo'),
            disabled: !canRedo,
            onClick: () => {
              redo();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'redo' });
            },
          },
          {
            key: 'edit.cut',
            text: formatMessage('Cut'),
            disabled: !actionSelected,
            onClick: () => {
              EditorAPI.Actions.CutSelection();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'cut' });
            },
          },
          {
            key: 'edit.copy',
            text: formatMessage('Copy'),
            disabled: !actionSelected,
            onClick: () => {
              EditorAPI.Actions.CopySelection();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'copy' });
            },
          },
          {
            key: 'edit.move',
            text: formatMessage('Move'),
            disabled: !actionSelected,
            onClick: () => {
              EditorAPI.Actions.MoveSelection();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'move' });
            },
          },
          {
            key: 'edit.delete',
            text: formatMessage('Delete'),
            disabled: !actionSelected,
            onClick: () => {
              EditorAPI.Actions.DeleteSelection();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'delete' });
            },
          },
        ],
      },
    },
    {
      type: 'dropdown',
      text: formatMessage('Disable'),
      align: 'left',
      disabled: !actionSelected,
      buttonProps: {
        iconProps: { iconName: 'RemoveOccurrence' },
      },
      menuProps: {
        onMenuOpened: () => {
          TelemetryClient.track('ToolbarButtonClicked', { name: 'disableDropdown' });
        },
        items: [
          {
            key: 'disable',
            text: formatMessage('Disable'),
            disabled: !showDisableBtn,
            onClick: () => {
              EditorAPI.Actions.DisableSelection();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'disable' });
            },
          },
          {
            key: 'enable',
            text: formatMessage('Enable'),
            disabled: !showEnableBtn,
            onClick: () => {
              EditorAPI.Actions.EnableSelection();
              TelemetryClient.track('ToolbarButtonClicked', { name: 'enable' });
            },
          },
        ],
      },
    },
  ];

  const addNewBtnRef = useCallback((addNew) => {
    onboardingAddCoachMarkRef({ addNew });
  }, []);

  return (
    <div css={{ position: 'relative' }} data-testid="DesignPage-ToolBar">
      <span
        ref={addNewBtnRef}
        css={{ width: 120, height: '100%', position: 'absolute', left: 0, visibility: 'hidden' }}
        data-testid="CoachmarkRef-AddNew"
      />
      <Toolbar toolbarItems={toolbarItems} />
    </div>
  );
};

export default CommandBar;
