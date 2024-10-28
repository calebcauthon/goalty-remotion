import React from 'react';
import { AbsoluteFill } from 'remotion';
type Props = {
  propOne: string;
  propTwo: number;
}
 
export const MyComponent: React.FC<Props> = ({propOne, propTwo}) => {
  return (
    <AbsoluteFill>
      <div style={{
        color: 'black',
        fontSize: '72px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50%'
      }}>props: {propOne}, {propTwo}</div>
      <div style={{
        color: 'white',
        fontSize: '72px', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50%'
      }}>props: {propOne}, {propTwo}</div>
    </AbsoluteFill>
  );
}