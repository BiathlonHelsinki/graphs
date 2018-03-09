
var margin = {top: 120, right: 100, bottom: 100, left: 100};
var offset = 30;
var padding = 30;

var width = $(window).width() - margin.left - margin.right - 30,
    height =  $(window).height() - margin.top - margin.bottom - 20;

var svg;
var data;
var data_ext = {};
var pledges_to_proposals;
var timer;


var scaleX = d3.scaleLinear().range([0, width])
var scaleX_size = d3.scaleLog().range([0, width])
var scaleTime = d3.scaleLinear();

var scaleY = d3.scaleLinear().range([0, height])
var axis =  d3.axisTop().tickSize(-height);

var propsContainer, 
    pledgesContainer, 
    eventContainer, 
    memberContainer,
    activitiesContainer;

var types = [
    {  
      type: 'attended',
      color: 'purple'
    }, {
      type: 'pledged_to',
      color: 'red'
    }, {
      type: 'proposed',
      color: 'orange'
    }, {
      type: 'edited',
      color: 'orange'
    }, {
      type: 'commented_on',
      color: 'yellow'
    }
  ];

var t = d3.transition()
    .duration(1500)
    .ease(d3.easeLinear);

// 2016-10-19 08:42:17
var parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");


$(document).ready(function(){

	svg = d3.select("#graph").append("svg")
	    .attr("width", width + margin.left + margin.right )
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append('line').attr('id','attach').style('opacity',0).style('stroke','#222')    

	d3.json("props.json", function(dataIn) {
	  data_ext['proposals'] = dataIn;
    
    d3.json("events_instances_tmp.json", function(ent) {
      data_ext['events_data'] = ent;
    
      d3.json("pledges.json", function(pldg) {
        data_ext['pledges'] = pldg;
          
        d3.json("activities.json", function(act) {
          data_ext['activities'] = act;
  
          d3.json("members.json", function(memb) {
            data_ext['members'] = memb;

            // add comments json here once cleaned

        	  //Organise data function
        	  organiseData();
        	
        	  // Visualise Data
        	  startVisualisation();
            // makeVis();
          });
        });
    	});
    });
  });
});

function organiseData(){

  max = d3.max( data_ext['proposals'] ,function(d){ return ("scheduled" in d ) ? parseDate('2017-09-01 12:00:00'):parseDate(d.proposal_created_at); } )
  min = d3.min(  data_ext['proposals'] ,function(d){ return ("scheduled" in d ) ? parseDate(d.event_created_at):parseDate(d.proposal_created_at); } )
  scaleX.domain([min,max])

  scaleTime.domain([min,max]).range([0,6000])
  axis.scale(scaleX).ticks(5).tickFormat( d3.timeFormat("%m-%Y") )

  max_size = d3.max( data_ext['pledges'] ,function(d){ return !("deleted_at" in d ) ? d.pledge:10; } )  
  min_size = d3.min( data_ext['pledges'] ,function(d){ return !("deleted_at" in d ) ? d.pledge:10; } )  
  scaleX_size.domain([min_size,max_size]);

  data_ext['pledges_to_proposals'] = data_ext['pledges'].filter(function(d){ return  ( d.item_type == 'Proposal' || d.item_type =='Event' )  ;}) // !('deleted_at' in d) &&
  data_ext['events_noOpenTime'] = data_ext['events_data'].filter(function(d){ return d.event_id != 1; })
  data_ext['activities_onEvents'] = data_ext['activities'].filter(function(d){ return d.item_type == 'Instance' || d.item_type == 'Proposal' || d.item_type == 'Pledge' ; })

}



function startVisualisation(){
  
  initialise();
  fullData();
  update();

  // transfer to canvas
  // add events
  // add animation 

}

function fullData(){
  data_ext['t_proposals'] = data_ext['proposals']
  data_ext['t_pledges_to_proposals'] = data_ext['pledges_to_proposals']
  data_ext['t_events_data'] = data_ext['events_data']
  data_ext['t_members'] = data_ext['members']
  data_ext['t_activities_onEvents'] = data_ext['activities_onEvents'];
}

function initialise(){
  svg.append('g').attr('class',"axis")
     .call(axis)

  // Check how many 4 month periods we have:
  background = svg.append('g').attr('class',"axis_background");
  current = scaleX.domain()[0];
  tick = 0;
  while( current < scaleX.domain()[1] ){
    background.append('rect')
      .attr('x', scaleX(current))
      .attr('y',0)
      .attr('width', scaleX(current) -  scaleX(d3.timeMonth.offset(current,-3)) )
      .attr('height', height)
      .style('fill', function(d){ return (tick%2 == 0) ? '#f8f8f8':'#fff'; })

      current = d3.timeMonth.offset(current,3)
      tick++;
  }

  addLegends();

  // 1 Proposals at the top
  propsContainer = svg.append('g').attr('class','proposals')
                              .attr('transform','translate(0,'+ getOffsetY('Proposals') + ')')
  propsContainer.append('text')
                .text('PROPOSALS')
                .attr('x',-margin.left)
                .attr('class','labels')

  // 2 pledges
  pledgesContainer = svg.append('g').attr('class','pledges')
                        .attr('transform','translate(0,'+ getOffsetY('Pledges') +')')
  pledgesContainer.append('text')
              .text('PLEDGES')
              .attr('x', -margin.left)
              .attr('class','labels')

  // 3 events              
  eventContainer = svg.append('g').attr('class','events')
                    .attr('transform','translate(0,'+ getOffsetY('Events') +')')
  eventContainer.append('text')
            .text('EVENTS')
            .attr('x', -margin.left)
            .attr('class','labels')

  // 4 members
  memberContainer = svg.append('g').attr('class','members')
                    .attr('transform','translate(0,'+ getOffsetY('Members') +')')
  memberContainer.append('text')
      .text('MEMBERS')
      .attr('x',-margin.left)
      .attr('class','labels')

  // 5 activities
  activitiesContainer = svg.append('g').attr('class','activities');
}

function update(){
  
  // 1 Proposals at the top
  props = propsContainer.selectAll('.proposals')
          .data(data_ext['t_proposals'], function(d){  if(!("scheduled" in d)  ){ return d.id } })
          .enter()
          .append('circle').attr('class','proposals')
          .attr('cx', function(d){ return  scaleX(parseDate(d.proposal_created_at)) ; })
          .attr('cy', function(d,i){
            return (i%4)*15; // height 4*15 = 60px 
           })
          // .transition(t)
          .attr('r', function(d){ return (d.recurrence ? d.recurrence: 1) + 1; })
          .style('fill', function(d){ return 'rgba(0,0,0,0)' ; })
          .style('stroke-width','1')
          .style('stroke', '#000')


  // 2 pledges
  pledges = pledgesContainer.selectAll('.pledge')
      .data(data_ext['t_pledges_to_proposals'], function(d){ return d.id})
        .enter().append('circle')
        .attr('class','pledge')
        // .attr('cx', function(d){ return scaleX_size((d.pledge)); }) 
        .attr('cx', function(d){ return scaleX(parseDate(d.created_at) ); }) 
        .attr('cy', function(d,i){
          return (i%8)*15;  // height 8*15 = 120
        })
        .attr('r', function(d){ return ((d.pledge)/20 < 1) ? 1:(d.pledge)/20; })
        .style('fill','red')
  
  // 3 events
  evnts = eventContainer.selectAll('.evnt')
        .data(data_ext['t_events_data']).enter()
        .append('circle').attr('class','evnt')
        .attr('cx', function(d){ return ( ('start_at' in d) ? scaleX(parseDate(d.start_at)):scaleX(parseDate(d.created_at)) ) ; })
        .attr('cy', function(d,i){ 
          return (i%4)*15; // height 4*15 = 60 
        })
        .attr('r', function(d){ return 2; })
        .style('fill', function(d){ return '#000'; })
        .style('stroke-width','1')
        .style('stroke', '#000');

  // 4 members
  members = memberContainer.selectAll('.member')
          .data(data_ext['t_members']).enter()
          .append('rect').attr('class','member')
          .attr('x', function(d){ return scaleX(parseDate(d.created_at)); })
          .attr('y', function(d,i) { 
            return  (i%10)*15; 
          })
          .attr('width',3)
          .attr('height',4);


  // 5 activities
  activities = activitiesContainer.selectAll('.activity')
              .data(data_ext['t_activities_onEvents']).enter()
              .append('line').attr('class','activity')
              .attr('x2', function (d) {
                 if( d.user_id !=0){
                  ee = members.filter(function(v){ return (d.user_id == v.id) ; })
                 return parseFloat(ee.attr('x')) + 1.5;
                }else{ 
                  return d3.select(this).attr('x1');
                }
              })
              .attr('y2', function (d){
                if( d.user_id !=0){
                  ee = members.filter(function(v){ return (d.user_id == v.id) ; });
                  return  parseFloat(ee.attr('y')) + getOffsetY('Members')
                }
                else{ 
                  console.log('USER 0'); 
                  return (11)*15 + getOffsetY('Members');
                }
              })
              .classed('anonymous', function(d){ (d.user_id == 0); })
              .style('stroke', function(d){
                return getColorCoding(d.description);
              })
             .attr('x1', function(d){ 
              if( d.item_type == 'Instance'){
                ee = evnts.filter(function(v){ return (d.item_id == v.id); })
              }else if(d.item_type == 'Proposal') {
                ee = props.filter(function(v){ return (d.item_id == v.id); });
              }else if(d.item_type == 'Pledge'){
                ee = pledges.filter(function(v){ return (d.item_id == v.id); });
              } 
              return ee.attr('cx');                      
            })
            .attr('y1', function(d){
              if( d.item_type == 'Instance'){
                ee = evnts.filter(function(v){ return (d.item_id == v.id); });
                return  parseFloat(ee.attr('cy')) +  + getOffsetY('Events');
              }else if(d.item_type == 'Proposal') {
                ee = props.filter(function(v){ return (d.item_id == v.id); });
                return parseFloat(ee.attr('cy')) + getOffsetY('Proposals');
              }else if(d.item_type == 'Pledge'){
                ee = pledges.filter(function(v){ return (d.item_id == v.id); });                      
                return parseFloat(ee.attr('cy')) + getOffsetY('Pledges');
              }
            })
                             
  addEvents();

}


function addEvents(){

  // pledgesContainer.selectAll('line')
  //       .data(data_ext['t_pledges_to_proposals']).enter().append('line')
  //       .attr('x1', function (d) {
  //         var gg = null; 
  //         if(d.item_type =='Proposal' ){ 
  //           props.each( function(v,o){  if(v['id'] === d.item_id) { gg = this; return; } });
  //         }else{ 
  //           evnts.each( function(v,o){ if(v['id'] === d.item_id) { gg = this; return; } });
  //         } 
  //         // if(gg == null) { console.log(d.item_id + ' ' + d.item_type)}
  //         return parseFloat(d3.select(gg).attr('cx'));
  //       })
  //       .attr('y1', function (d) {
  //         var gg = null; 
  //         if(d.item_type =='Proposal' ){ 
  //           d3.selectAll('.proposals').each( function(v,o){  if(v['id'] === d.item_id) { gg = this; return; } });
  //         }else{ 
  //           d3.selectAll('.evnts').each( function(v,o){  if(v['id'] === d.item_id) { gg = this; return; } });
  //         }
  //         return parseFloat(d3.select(gg).attr('cy')) + getOffsetY('Proposal');
  //       })
  //       .attr('x2',function(d){ return scaleX( parseDate(d.created_at) ); }) 
  //       // .attr('x2',function(d){ return scaleX_size(d.pledge); }) 
  //       .attr('y2', function(d,i){ 
  //         if( position_map[d.item_id] < 2 ){
  //           return offset - (i%4)*15 - 30 ; 
  //         }else{
  //           return (i%4)*15 + offset + 90;
  //         }
  //       })
  //       .style('stroke','rgba(150,150,150,0.02')
  

  // props.on('mouseover', function(){
  //   var selected = d3.select(this);
  //   selected.style('fill','red')
    
  //   // Get all connected proposals
  //   var hh;
  //   if( 'event_id' in selected.datum() ){ 
  //     props.filter(function(v){ return ( ('event_id' in v) &&  v['event_id'] == selected.datum()['event_id'] );  })
  //       .style('fill', 'red')
  //   }

  //   // Connect to event
  //   var gg = null; 
  //   d3.selectAll('.evnts').each(function(v){ if(v['id'] == selected.datum()['event_id']){ gg = this; }; })
  //   if (gg){
  //   d3.select('#attach')
  //     .attr('x1', selected.attr('cx') )
  //     .attr('y1',selected.attr('cy'))
  //     .attr('x2',d3.select(gg).attr('cx') )
  //     .attr('y2', d3.select(gg).attr('cy') )
  //     .style('opacity',1)
  //   }

  //   // Connect to pledges
  //   var jj;
  //   pledgesContainer.selectAll('line').filter(function(v){ return ( v['item_type']=='Proposal' && v['item_id'] == selected.datum()['id'] ); })
  //     .style('stroke','rgba(150,150,150,0.2' )
  // })
  // .on('mouseout', function(){
  //   evnts.style('fill','red')
  //   props.style('fill','rgba(0,0,0,0)')
  //   d3.select('#attach').style('opacity',0)
  //   pledgesContainer.selectAll('line').style('stroke','rgba(150,150,150,0.01' )

  // })

  // evnts.on('mouseover', function(){
  //   var selected = d3.select(this);
  //   selected.style('fill','red')
    
  //   // Connect to event
  //   var gg = null; 
  //   props.each(function(v){ if(v['event_id'] == selected.datum()['id']){ gg = this; }; })
  //   if (gg){
  //   d3.select('#attach')
  //     .attr('x1', selected.attr('cx') )
  //     .attr('y1',selected.attr('cy'))
  //     .attr('x2',d3.select(gg).attr('cx') )
  //     .attr('y2', d3.select(gg).attr('cy') )
  //     .style('opacity',1);
  //   }

  //   // Connect to pledges
  //   var jj;
  //   pledgesContainer.selectAll('line').filter(function(v){ return ( v['item_type']=='Event' && v['item_id'] == selected.datum()['id'] ); })
  //     .style('stroke','rgba(150,150,150,0.2' )

  //   pledgesContainer.selectAll('line').filter(function(v){ return ( v['item_type']=='Proposal' && v['item_id'] == selected.datum()['proposal_id'] ); })
  //     .style('stroke','rgba(150,150,150,0.2' )
  // })
  // .on('mouseout', function(d){ 
  //   evnts.style('fill','red)')
  //   props.style('fill','rgba(0,0,0,0)')
  //   d3.select('#attach').style('opacity',0)
  //   pledgesContainer.selectAll('line').style('stroke','rgba(150,150,150,0.01' )
  // })

  d3.selectAll('.proposals').moveToFront()
  d3.selectAll('.events').moveToFront()
  d3.selectAll('.members').moveToFront()
  d3.selectAll('.evnts').moveToFront()

}


function addLegends(){

  box_type = svg.append('g').attr('class','legend')
      .selectAll('.lineTypes').data(types).enter()
      .append('g')
      .attr('transform', function(d,i){ return 'translate('+(100*i)+','+ (-margin.top + 20) +')' })
      
  box_type.append('rect')
      .attr('x',0).attr('y',-10)
      .attr('width', 10)
      .attr('height',10)
      .style('fill', function(d){ return d.color; })
    
  box_type.append('text')
      .attr('x',15).attr('y',0)
      .text(function(d){ return d.type; })
      

}

function getColorCoding(type){
  if(type == 'attended' ){ return 'purple';}
  else if( type == 'pledged_to'){ return 'red' }
  else if( type == 'proposed' || type == 'edited') { return 'orange' }
  else if( type == 'commented_on'){ return 'yellow'}
}


function getOffsetY(type){

  ret = 0 ;
  switch(type){
    case 'Proposals':{
      ret = offset;
      break;
    };
    case 'Pledges':{
      ret = (offset + 4*15 + padding );
      break;
    };
    case 'Events':{
      ret = (offset + 4*15 + 8*15 + padding*2 ) ;
      break;
    };
    case 'Members':{
      ret = (offset*5 + 4*15 + 8*15 + 4*15 + padding*3);
      break;
    }
    default: {
      ret = 0;
    }
  }

  return ret;
}

// http://bl.ocks.org/mbostock/7555321
// Wrap text labels - a bit modified
//call with text... .call(wrap, MAXLABELWIDTH)
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
    	dy = 0, // CHANGED from dy = parseFloat(text.attr("dy")), since it might not be defined already
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
       //  Changed the  ++lineNumber * lineHeight TO lineHeight only why increase the line height everytime?
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy",lineHeight + dy + "em").text(word);
      }
    }
  });
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
