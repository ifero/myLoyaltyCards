/**
 * DetailRow Component Tests
 * Story 2.6: View Card Details
 * Story 22.3: Card Detail — the frame row
 *
 * Rendered through the real `StoryDecorator`, because the row's colours are the scheme's roles.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { TYPOGRAPHY } from '@/shared/theme/typography';

import { StoryDecorator } from '@/.storybook/StoryDecorator';

import { DetailRow } from './DetailRow';

type Scheme = 'light' | 'dark';
type RowProps = React.ComponentProps<typeof DetailRow>;

const renderRow = (props: Partial<RowProps> = {}, scheme: Scheme = 'light') =>
  render(
    <StoryDecorator theme={scheme}>
      <DetailRow label="Number" value="1234 5678 9012 8" testID="row" {...props} />
    </StoryDecorator>
  );

const flat = (element: { props: { style: unknown } }) =>
  StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;

describe('DetailRow', () => {
  it('is at least 48pt tall, padded 12 / 16, its label and value 12 apart', () => {
    renderRow();
    expect(flat(screen.getByTestId('row'))).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12
    });
  });

  // The divided `Surface` around the rows draws the rules between them.
  it('draws no rule of its own', () => {
    renderRow();
    expect(flat(screen.getByTestId('row')).borderBottomWidth).toBeUndefined();
  });

  it.each<[Scheme, string, string]>([
    ['light', '#55555F', '#181824'],
    ['dark', '#B5B5AB', '#F0F0E8']
  ])('sets the label and the value in bodyMd, muted and primary, in %s', (scheme, muted, ink) => {
    renderRow({}, scheme);
    expect(flat(screen.getByText('Number'))).toMatchObject({ ...TYPOGRAPHY.bodyMd, color: muted });
    expect(flat(screen.getByText('1234 5678 9012 8'))).toMatchObject({
      ...TYPOGRAPHY.bodyMd,
      color: ink
    });
  });

  // A long value — a QR code's URL — is cut in the middle, so both of its ends stay readable.
  it('sets the value right, on one line, cut in the middle', () => {
    renderRow();
    const value = screen.getByText('1234 5678 9012 8');
    expect(flat(value)).toMatchObject({ flex: 1, textAlign: 'right' });
    expect(value.props.numberOfLines).toBe(1);
    expect(value.props.ellipsizeMode).toBe('middle');
  });

  it('sets a card number in monoCode', () => {
    renderRow({ mono: true });
    expect(flat(screen.getByText('1234 5678 9012 8'))).toMatchObject(TYPOGRAPHY.monoCode);
  });

  it('is not a button without a handler', () => {
    renderRow();
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('tappable', () => {
    it('is one button named by its label and its value', () => {
      const onPress = jest.fn();
      renderRow({ onPress, accessibilityHint: 'Double tap to copy' });
      const button = screen.getByRole('button');

      expect(button.props.accessibilityLabel).toBe('Number: 1234 5678 9012 8');
      expect(button.props.accessibilityHint).toBe('Double tap to copy');
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    // As `ActionRow` does: the surface steps up while the row is held, from explicit press state.
    it.each<[Scheme, string]>([
      ['light', '#F7F7F1'],
      ['dark', '#20202E']
    ])('takes surfaceElevated while held in %s, and lets go on release', (scheme, elevated) => {
      renderRow({ onPress: jest.fn() }, scheme);
      const button = screen.getByRole('button');

      expect(flat(button).backgroundColor).toBe('transparent');
      fireEvent(button, 'pressIn');
      expect(flat(screen.getByRole('button')).backgroundColor).toBe(elevated);
      fireEvent(button, 'pressOut');
      expect(flat(screen.getByRole('button')).backgroundColor).toBe('transparent');
    });
  });
});
