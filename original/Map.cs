using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Drawing;

namespace CSharpRPG
{
    class Map
    {
        private List<Character> _chars = new List<Character>();

        public List<Character> Chars
        {
            get
            {
                return _chars;
            }
        }

        // BUG FIX:  declare map outside the constructor but initialize it inside the constructor
        private ISymbol[,] map;
        private int _size;
        private TileSet _ts;

        public Map(int Size, TileSet ts)
        {
            _size = Size;
            _ts = ts;
            //bug fix: map must be initialized in constructor
            map = new ISymbol[_size, _size];
        }

        //This method calculates the total number of positions on the map
        public int TotalPositions
        {
            get 
            { return _size * _size; }
        }

        // silly!
        // just use charecter instance .position
        public Point this[Character c]
        {
            get
            {
                return c.Position;
            }
            set
            {
                c.Position = value;
            }
        }

        public Character localCharacter(Point p)
        {
             foreach (Character c in _chars)
             {
                 if (c.Position == p) return c;
             }
             return null;
        }

        public ISymbol this[int x, int y]
        {
            get
            {
                if (!PositionValid(new Point(x, y)))
                    throw new IndexOutOfRangeException();
                return map[x, y];
            }
            set
            {
                if (!PositionValid(new Point(x, y)))
                    throw new IndexOutOfRangeException();
                map[x, y] = value;

            }
        }

        public ISymbol GetSymbol(int x, int y)
        {
            return map[x, y];
        }
        
        public Color[,] GetColors()
        {
            
            Color[,] clrs = new Color[_size, _size];
            for (int x = 0; x < _size; x++)
                for (int y = 0; y < _size; y++)
                {
                    if (map[x, y] != null)
                        clrs[x, y] = map[x, y].Color;
                    else // symbol is null, color is black:
                        clrs[x, y] = Color.Black;
                }

            // ASSUME player is Chars[0]
            foreach (Character c in Chars)
            {
                if (c > Chars[0])
                    clrs[c.Position.X, c.Position.Y] = Color.Red;
            }

            //bug fix:  needs return statement
            return clrs;

        }
        
        public Image[,] GetImages()
        {
            Image[,] imgs = new Image[_size, _size];
            for (int x = 0; x < _size; x++)
                for (int y = 0; y < _size; y++)
                {
                    if (map[x, y] != null && map[x, y].TileID.HasValue) {
                        imgs[x, y] = _ts.GetTile(map[x, y].TileID.Value);
                    } else {
                        imgs[x, y] = null;
                    }
                    
                }

            foreach (Character chr in Chars)
                imgs[chr.Position.X, chr.Position.Y] = _ts.GetTile(chr.TileID);

            return imgs;

        }
        
        public void CreateRoom(Point UpperLeft, Point LowerRight)
        {
            // Throw exception if upper left not
            // up and to the left of lower right
            // or if either is invalid
            if (UpperLeft.X >= LowerRight.X || UpperLeft.Y >= LowerRight.Y || !PositionValid(UpperLeft) || !PositionValid(LowerRight))
            { throw new ArgumentOutOfRangeException("Not a valid location"); }
            else
            { 

            // modify map to create a room spanning the given points
            //create variables
            int y = 0;
            int x = 0;
            int start = 0;
            int end = 0;
            //Create Corners
            map[UpperLeft.X, UpperLeft.Y] = new Symbols.Wall(Symbols.Wall.Walls.WALL_TOP_CORNER);
            map[LowerRight.X, UpperLeft.Y] = new Symbols.Wall(CSharpRPG.Symbols.Wall.Walls.WALL_TOP_CORNER);
            map[UpperLeft.X, LowerRight.Y] = new Symbols.Wall(CSharpRPG.Symbols.Wall.Walls.WALL_BOTTOM_CORNER);
            map[LowerRight.X, LowerRight.Y] = new Symbols.Wall(CSharpRPG.Symbols.Wall.Walls.WALL_BOTTOM_CORNER);
            //create top wall
            //use upperleft Y and start at upperleft x +1 till < lowerRight x
            y = UpperLeft.Y;
            start = UpperLeft.X + 1;
            end = LowerRight.X;
            for (int i = start; i < end; i++)
            {
                map[i, y] = new Symbols.Wall(Symbols.Wall.Walls.WALL_HORZ);
            }
            //create left wall
            x = UpperLeft.X;
            start = UpperLeft.Y + 1;
            end = LowerRight.Y;
            for (int i = start; i < end; i++)
            {
                map[x, i] = new Symbols.Wall(Symbols.Wall.Walls.WALL_VERT);
            }
            //create right wall
            x = LowerRight.X;
            start = UpperLeft.Y + 1;
            end = LowerRight.Y;
            for (int i = start; i < end; i++)
            {
                map[x, i] = new Symbols.Wall(Symbols.Wall.Walls.WALL_VERT);
            }
            //create bottom wall
            y = LowerRight.Y;
            start = UpperLeft.X + 1;
            end = LowerRight.X;
            for (int i = start; i < end; i++)
            {
                map[i, y] = new Symbols.Wall(Symbols.Wall.Walls.WALL_HORZ);
            }
            //create floor
            //use double loop and go from UpperLeft +1,+1 till < lowerRight
            y = UpperLeft.Y + 1;
            x = UpperLeft.X + 1;
            for (int i = y; i < LowerRight.Y; i++)
                for (int n = x; n < LowerRight.X; n++)
                {
                    map[n, i] = new Symbols.Floor();
                }
            }


        }

        public void CreateHall(Point Start, Point End)
        {

            // Throw exception if start not in line
            // with end, or if either is invalid
            if ((Start.X != End.X && Start.Y != End.Y) || !PositionValid(Start) || !PositionValid(End))
            { throw new ArgumentOutOfRangeException("Not valid hallway specifications."); }


            // ASSUME: hallway is either horizontal or vertical
            // no angle, or turn
            // either both X coordinates match,  OR both Y coordinates match
            //Set doors at either end
                       
            //figure out if vertical or horizontal
            if (Start.X == End.X)
            {
                // Set doors at either end that open vertically.
                map[Start.X, Start.Y] = new Symbols.Door(true);
                map[End.X, End.Y] = new Symbols.Door(true);

                int x = Start.X;
                int start = Start.Y + 1;
                int end = End.Y;
                for (int i = start; i < end; i++)
                {
                    map[x, i] = new Symbols.Floor();
                }
            }
            else
            {
                // Set doors at either end that open horizontally:
                map[Start.X, Start.Y] = new Symbols.Door(false);
                map[End.X, End.Y] = new Symbols.Door(false);

                int y = Start.Y;
                int start = Start.X + 1;
                int end = End.X;
                for (int i = start; i < end; i++)
                {
                    map[i, y] = new Symbols.Floor();
                }
            }

        }
        //given a point this method determines if that point is a valid location within the map
        public bool PositionValid(Point position)
        { 
            bool posValid = true;
            if (position.X < 0 || position.X >= _size)
            {posValid = false;}
            if (position.Y < 0 || position.Y >= _size)
            { posValid = false; }

            return posValid;
        }

        public Point? FindSymbol(ISymbol symb)
        {
            for (int x = 0; x < _size; x++)
                for (int y = 0; y < _size; y++)
                {
                    if (Object.ReferenceEquals(map[x, y], symb))
                    {
                        return new Point(x, y);
                    }
                }
            // ??
            return null;
        }
    }
}
