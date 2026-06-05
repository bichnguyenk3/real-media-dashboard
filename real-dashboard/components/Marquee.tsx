'use client'

export default function Marquee() {
  const base = 'https://wbzydqwvadklutwvmwpa.supabase.co/storage/v1/object/public/post-files'
  const all = [1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9]
  return (
    <>
      <style>{`
        @keyframes mq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .mq-track{animation:mq 40s linear infinite}
        .mq-track:hover{animation-play-state:paused}
      `}</style>
      <div style={{width:'100%',overflow:'hidden',background:'#EAE3D5',borderBottom:'1px solid #D8D0C0',height:260}}>
        <div className="mq-track" style={{display:'flex',gap:3,height:'100%',width:'max-content'}}>
          {all.map((n,i)=>(
            <div key={i} style={{flexShrink:0,width:190,height:260,overflow:'hidden'}}>
              <img src={`${base}/${n}.jpg`} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center',display:'block'}}/>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
