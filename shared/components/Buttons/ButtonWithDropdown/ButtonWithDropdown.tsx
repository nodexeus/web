import {
  ReactNode,
  useRef,
  useState,
  isValidElement,
  cloneElement,
  ReactElement,
} from 'react';
import { styles } from './ButtonWithDropdown.styles';
import { useClickOutside } from '@shared/hooks/useClickOutside';
import { DropdownMenu } from '@shared/components';

type Props = {
  children?: ReactNode;
  button: React.ReactElement<{ onClick?: () => void }>;
};

export function ButtonWithDropdown({ children, button }: Props) {
  const [isOpen, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const handleClick = () => setOpen(!isOpen);
  const handleClickOutside = () => setOpen(false);
  useClickOutside<HTMLDivElement>(dropdownRef, handleClickOutside);

  return (
    <div ref={dropdownRef} css={[styles.base]}>
      {cloneElement(button, { onClick: handleClick })}
      <DropdownMenu isOpen={isOpen} additionalStyles={styles.dropdown}>
        {children}
      </DropdownMenu>
    </div>
  );
}
