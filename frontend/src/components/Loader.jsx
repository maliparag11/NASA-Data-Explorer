import React from 'react';
export default function Loader({text='Loading...'}) {
  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status"/>
      <div className="mt-2">{text}</div>
    </div>
  );
}
