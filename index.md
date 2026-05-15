---
layout: default
---
<h1>{{ site.title }}</h1>
<p class="lead">{{ site.description }}</p>

<ul class="episode-list">
  {% for post in site.posts %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    {% if post.episode_number %}<span class="ep-num">nr. {{ post.episode_number }}</span>{% endif %}
    <time datetime="{{ post.date | date: '%Y-%m-%d' }}">{{ post.date | date: "%-d. %b %Y" }}</time>
  </li>
  {% endfor %}
</ul>
