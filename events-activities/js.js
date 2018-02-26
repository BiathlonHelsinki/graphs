
var margin = {top: 120, right: 100, bottom: 100, left: 100};
var offset = 30;

var width = $(window).width() - margin.left - margin.right - 30,
    height =  $(window).height() - margin.top - margin.bottom - 20;

var svg;
var data;
var data_ext = {};
var pledges_to_proposals;

var scaleX = d3.scaleLinear().range([0, width])
var scaleX_size = d3.scaleLog().range([0, width])
// var scaleRadius = d3.scaleLinear().range([1, 10])
var scaleY = d3.scaleLinear().range([0, height])
var axis =  d3.axisTop().tickSize(-height);


// 2016-10-19 08:42:17
var parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
var position_map = {};

$(document).ready(function(){

	svg = d3.select("#graph").append("svg")
	    .attr("width", width + margin.left + margin.right )
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append('line').attr('id','attach').style('opacity',0).style('stroke','#222')    

	d3.json("props.json", function(dataIn) {
	  data = dataIn;
    
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
        	  makeVis();
          });
        });
    	});
    });
  });
});

function organiseData(){

  max = d3.max( data ,function(d){ return ("scheduled" in d ) ? parseDate('2017-09-01 12:00:00'):parseDate(d.proposal_created_at); } )
  min = d3.min( data ,function(d){ return ("scheduled" in d ) ? parseDate(d.event_created_at):parseDate(d.proposal_created_at); } )
  scaleX.domain([min,max])
  axis.scale(scaleX).ticks(5).tickFormat( d3.timeFormat("%m-%Y") )

  max_size = d3.max( data_ext['pledges'] ,function(d){ return !("deleted_at" in d ) ? d.pledge:10; } )  
  min_size = d3.min( data_ext['pledges'] ,function(d){ return !("deleted_at" in d ) ? d.pledge:10; } )  

  scaleX_size.domain([min_size,max_size]);
  // scaleRadius.domain([min_size,max_size]);

  data_ext['pledges_to_proposals'] = data_ext['pledges'].filter(function(d){ return  !('deleted_at' in d) && ( d.item_type == 'Proposal' || d.item_type =='Event' )  ;})
  data_ext['events_noOpenTime'] = data_ext['events_data'].filter(function(d){ return d.event_id != 1; })
  data_ext['activities_onEvents'] = data_ext['activities'].filter(function(d){ return d.item_type == 'Instance' || d.item_type == 'Proposal'; })

  console.log(data_ext['events_noOpenTime'].length)

  console.log(data_ext['events_data'].length)
}

function makeVis(){

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
      .style('fill', function(d){ return (tick%2 == 0) ? '#fafafa':'#fff'; })

      current = d3.timeMonth.offset(current,3)
      tick++;
  }
  
  // 1 Proposals at the top
  propsContainer = svg.append('g').attr('class','proposals')
  props = propsContainer.selectAll('.proposals')
          .data(data, function(d){  if(!("scheduled" in d) || d['stopped.x'] == 't' ){ return d.id } }).enter()
          .append('circle').attr('class','proposals')
          .attr('cx', function(d){ return  scaleX(parseDate(d.proposal_created_at)) ; })
          .attr('cy', function(d,i){
            return (i%4)*15 + offset; // height 4*15 = 60px 
           })
          .attr('r', function(d){ return d.recurrence + 1; })
          .style('fill', function(d){ return 'rgba(0,0,0,0)' ; })
          .style('stroke-width','1')
          .style('stroke', '#000');
  
  // 2 pledges
  pledgesContainer = svg.append('g').attr('class','pledges');
  pledgesContainer.selectAll('.pledge')
      .data(data_ext['pledges_to_proposals'], function(d){ return d.id})
        .enter().append('circle')
        .attr('class','pledge')
        // .attr('cx', function(d){ return scaleX_size((d.pledge)); }) 
        .attr('cx', function(d){ return scaleX(parseDate(d.created_at) ); }) 
        .attr('cy', function(d,i){
          return offset + (i%8)*15 + 60 + 20;  // height 8*15 = 120
        })
        .attr('r', function(d){ return ((d.pledge)/20 < 1) ? 1:(d.pledge)/20; })
        .style('fill','#eeeeee')

  // 3 events
  eventContainer = svg.append('g').attr('class','events')
  evnts = eventContainer.selectAll('.evnt')
        .data(data_ext['events_noOpenTime']).enter()
        .append('circle').attr('class','evnt')
        .attr('cx', function(d){ return ( ('start_at' in d) ? scaleX(parseDate(d.start_at)):scaleX(parseDate(d.created_at)) ) ; })
        .attr('cy', function(d,i){ 
          return offset + (i%4)*15 + 60 + 120 + 40 ; // height 4*15 = 60 
        })
        .attr('r', function(d){ return 2; })
        .style('fill', function(d){ return 'red'; })
        .style('stroke-width','1')
        .style('stroke', 'red');

    // 4 members
    memberContainer = svg.append('g').attr('class','members')
    members = memberContainer.selectAll('.member')
            .data(data_ext['members']).enter()
            .append('rect').attr('class','member')
            .attr('x', function(d){ return scaleX(parseDate(d.created_at)); })
            .attr('y', function(d,i) { 
              return offset + (i%10)*15 + 60 + 120 + 60 + 60*2; 
            })
            .attr('width',3)
            .attr('height',4);

    // 5 activities
    activitiesContainer = svg.append('g').attr('class','activities');
    activities = activitiesContainer.selectAll('.activity')
                  .data(data_ext['activities_onEvents']).enter()
                  .append('line').attr('class','activity')
                  .attr('x1', function(d){ 

                    if( d.item_type == 'Instance'){
                      return evnts.filter(function(v){ return (d.item_id == v.id); }).attr('cx');
                    }else if(d.item_type == 'Proposal') {
                      console.log(props.filter(function(v){ return (d.item_id == v.id); }))
                      return props.filter(function(v){ console.log(v.id==d.item_id);return (d.item_id == v.id); }).attr('cx');
                    }
                  })
                  .attr('y1', function(d){
                    if( d.item_type == 'Instance'){
                      return evnts.filter(function(v){ return (d.item_id == v.id); }).attr('cy');
                    }else if(d.item_type == 'Proposal') {
                      return props.filter(function(v){ return (d.item_id == v.id); }).attr('cy');
                    }
                  })
                  .attr('x2', function (d) {
                    return members.filter(function(v){ return (d.user_id == v.id) ; }).attr('cx');
                  })
                  .attr('y2', function (d){
                    return members.filter(function(v){ return (d.user_id == v.id) ; }).attr('cy');
                  })
                  .style('stroke','red')
                             

    pledgesContainer.selectAll('line')
        .data(data_ext['pledges_to_proposals']).enter().append('line')
        .attr('x1', function (d) {
          var gg = null; 
          if(d.item_type =='Proposal' ){ 
            props.each( function(v,o){  if(v['id'] === d.item_id) { gg = this; return; } });
          }else{ 
            evnts.each( function(v,o){ if(v['id'] === d.item_id) { gg = this; return; } });
          } 
          if(gg == null) { console.log(d.item_id + ' ' + d.item_type)}
          return d3.select(gg).attr('cx');    
        })
        .attr('y1', function (d) {
          var gg = null; 
          if(d.item_type =='Proposal' ){ 
            d3.selectAll('.proposals').each( function(v,o){  if(v['id'] === d.item_id) { gg = this; return; } });
          }
          else{ 
            d3.selectAll('.evnts').each( function(v,o){  if(v['id'] === d.item_id) { gg = this; return; } });
          }
          return d3.select(gg).attr('cy');
        })
        .attr('x2',function(d){ return scaleX( parseDate(d.created_at) ); }) 
        // .attr('x2',function(d){ return scaleX_size(d.pledge); }) 
        .attr('y2', function(d,i){ 
          if( position_map[d.item_id] < 2 ){
            return offset - (i%4)*15 - 30 ; 
          }else{
            return (i%4)*15 + offset + 90;
          }
        })
        .style('stroke','rgba(150,150,150,0.02')
  props.on('mouseover', function(){
    var selected = d3.select(this);
    selected.style('fill','red')
    
    // Get all connected proposals
    var hh;
    if( 'event_id' in selected.datum() ){ 
      props.filter(function(v){ return ( ('event_id' in v) &&  v['event_id'] == selected.datum()['event_id'] );  })
        .style('fill', 'red')
    }

    // Connect to event
    var gg = null; 
    d3.selectAll('.evnts').each(function(v){ if(v['id'] == selected.datum()['event_id']){ gg = this; }; })
    if (gg){
    d3.select('#attach')
      .attr('x1', selected.attr('cx') )
      .attr('y1',selected.attr('cy'))
      .attr('x2',d3.select(gg).attr('cx') )
      .attr('y2', d3.select(gg).attr('cy') )
      .style('opacity',1)
    }

    // Connect to pledges
    var jj;
    pledgesContainer.selectAll('line').filter(function(v){ return ( v['item_type']=='Proposal' && v['item_id'] == selected.datum()['id'] ); })
      .style('stroke','rgba(150,150,150,0.2' )
  })
  .on('mouseout', function(){
    evnts.style('fill','red')
    props.style('fill','rgba(0,0,0,0)')
    d3.select('#attach').style('opacity',0)
    pledgesContainer.selectAll('line').style('stroke','rgba(150,150,150,0.01' )

  })

  evnts.on('mouseover', function(){
    var selected = d3.select(this);
    selected.style('fill','red')
    
    // Connect to event
    var gg = null; 
    props.each(function(v){ if(v['event_id'] == selected.datum()['id']){ gg = this; }; })
    if (gg){
    d3.select('#attach')
      .attr('x1', selected.attr('cx') )
      .attr('y1',selected.attr('cy'))
      .attr('x2',d3.select(gg).attr('cx') )
      .attr('y2', d3.select(gg).attr('cy') )
      .style('opacity',1);
    }

    // Connect to pledges
    var jj;
    pledgesContainer.selectAll('line').filter(function(v){ return ( v['item_type']=='Event' && v['item_id'] == selected.datum()['id'] ); })
      .style('stroke','rgba(150,150,150,0.2' )

    pledgesContainer.selectAll('line').filter(function(v){ return ( v['item_type']=='Proposal' && v['item_id'] == selected.datum()['proposal_id'] ); })
      .style('stroke','rgba(150,150,150,0.2' )
  
    })

  .on('mouseout', function(d){ 
    evnts.style('fill','red)')
    props.style('fill','rgba(0,0,0,0)')
    d3.select('#attach').style('opacity',0)
    pledgesContainer.selectAll('line').style('stroke','rgba(150,150,150,0.01' )
  })


  d3.selectAll('.proposals').moveToFront()
  d3.selectAll('.evnts').moveToFront()

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
